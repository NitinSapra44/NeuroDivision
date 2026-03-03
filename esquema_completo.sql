


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."assessment_status" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED'
);


ALTER TYPE "public"."assessment_status" OWNER TO "postgres";


CREATE TYPE "public"."assessment_types" AS ENUM (
    'PERSONAL',
    'INSTITUTION'
);


ALTER TYPE "public"."assessment_types" OWNER TO "postgres";


CREATE TYPE "public"."sex" AS ENUM (
    'MASCULINO',
    'FEMENINO'
);


ALTER TYPE "public"."sex" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_app_context"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_user_id uuid;
    v_role_name text;
    
    -- Variables para individual_client
    v_total_slots_contracted bigint; -- Solo cuenta suscripciones ACTIVAS
    v_slots_used_paying bigint;      -- Hijos propios registrados
    v_slots_read_only bigint;        -- Hijos institucionales
    v_primary_action text;           -- ADD_STUDENT o SUBSCRIBE
    
    -- Salida
    v_redirect_path text;
    v_view_type text; -- Dice al frontend qué componente cargar
    v_permissions json;
BEGIN
    v_user_id := auth.uid();

    -- 1. OBTENER ROL
    SELECT r.name INTO v_role_name
    FROM public.user_roles ur
    JOIN public.role r ON ur.rol_id = r.id
    WHERE ur.user_id = v_user_id
    LIMIT 1;

    CASE v_role_name
        
        -- =========================================================
        -- 1. FAMILIA (individual_client)
        -- =========================================================
        WHEN 'individual_client' THEN
            v_redirect_path := '/dashboard'; 
            v_view_type := 'individual_client_dashboard'; -- Nombre real del componente

            -- A. Contar Cupos ACTIVOS
            -- Si una suscripción venció (is_active=false), no suma cupo.
            SELECT COALESCE(SUM(effective_max_nna_allowed), 0) INTO v_total_slots_contracted
            FROM public.subscription 
            WHERE responsible_user = v_user_id AND is_active = true;

            -- B. Contar Alumnos Registrados (Hijos)
            SELECT COUNT(*) INTO v_slots_used_paying
            FROM public.responsible_nna_user 
            WHERE responsible_user = v_user_id AND can_edit = true;

            -- C. Contar Alumnos Institucionales
            SELECT COUNT(*) INTO v_slots_read_only
            FROM public.responsible_nna_user 
            WHERE responsible_user = v_user_id AND can_edit = false;

            -- D. Lógica del Botón Principal
            -- Si tengo más cupos activos que niños, puedo agregar.
            -- Si tengo 0 cupos activos o están todos llenos, debo suscribir/renovar.
            IF v_total_slots_contracted > v_slots_used_paying THEN
                v_primary_action := 'ADD_STUDENT';
            ELSE
                v_primary_action := 'SUBSCRIBE'; 
            END IF;

            v_permissions := json_build_object(
                'view_type', v_view_type,
                -- 'plan_status' ELIMINADO: La UI lo calcula individualmente por niño
                'primary_action', v_primary_action,  
                'slots_total', v_total_slots_contracted,
                'slots_used', v_slots_used_paying,
                'has_institutional_nna', (v_slots_read_only > 0)
            );

        -- =========================================================
        -- 2. PROFESOR (teacher)
        -- =========================================================
        WHEN 'teacher' THEN
            v_redirect_path := '/dashboard';
            v_view_type := 'teacher_dashboard'; -- Nombre real
            
            v_permissions := json_build_object(
                'view_type', v_view_type,
                'can_create_course', true,
                'can_invite_students', true
            );

        -- =========================================================
        -- 3. ADMIN INSTITUCIÓN (inst_admin)
        -- =========================================================
        WHEN 'inst_admin' THEN
            v_redirect_path := '/dashboard';
            v_view_type := 'admin_institution_dashboard'; -- Nombre real
            
            v_permissions := json_build_object(
                'view_type', v_view_type,
                'can_manage_teachers', true,
                'can_manage_billing', true
            );

        -- =========================================================
        -- 4. ADMIN NEURO (admin_neuro)
        -- =========================================================
        WHEN 'admin_neuro' THEN
            v_redirect_path := '/dashboard';
            v_view_type := 'admin_neuro_dashboard'; -- Nombre real
            
            v_permissions := json_build_object(
                'view_type', v_view_type,
                'is_platform_admin', true,
                'can_manage_everything', true
            );

        ELSE
            v_redirect_path := '/unauthorized';
            v_permissions := json_build_object('error', 'Rol no soportado');

    END CASE;

    RETURN json_build_object(
        'redirect_to', v_redirect_path,
        'permissions', v_permissions
    );
END;
$$;


ALTER FUNCTION "public"."get_app_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_assessment_step"("p_instance_id" bigint, "p_section_order" integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
    
    -- Variables
    v_template_id bigint;
    v_current_max_progress int;
    v_instance_status text;
    
    v_stepper json;
    v_items json;
BEGIN
    -- 1. VALIDACIÓN Y SEGURIDAD
    -- Verificamos que la instancia pertenezca al usuario y tenga permiso de edición
    SELECT 
        i.template_id, 
        COALESCE(i.current_section_order, 1), -- Default 1 si es nulo
        i.status
    INTO 
        v_template_id, 
        v_current_max_progress, 
        v_instance_status
    FROM public.assessment_response_instance i
    JOIN public.responsible_nna_user r ON i.nna_user_id = r.nna_user -- <--- CORREGIDO: nna_user_id
    WHERE i.id = p_instance_id 
    AND r.responsible_user = v_user_id 
    AND r.can_edit = true; 

    IF v_template_id IS NULL THEN
        RAISE EXCEPTION 'Diagnóstico no encontrado o acceso denegado.';
    END IF;

    -- Si ya terminó, lo mandamos al dashboard
    IF v_instance_status = 'COMPLETED' THEN
        RETURN json_build_object('status', 'COMPLETED', 'redirect', '/dashboard');
    END IF;

    -- 2. BLOQUEO DE SECCIONES FUTURAS (Anti-Trampa URL)
    -- Si intentan ir a la sección 5 escribiendo "/assessment/105/5" pero van en la 2:
    IF p_section_order > v_current_max_progress THEN
         RAISE EXCEPTION 'Sección bloqueada. Debes completar las anteriores.';
    END IF;

    -- 3. CONSTRUIR EL STEPPER (Barra Superior)
    SELECT json_agg(t) INTO v_stepper FROM (
        SELECT 
            ts.display_order,
            s.name as label,
            CASE 
                WHEN ts.display_order = p_section_order THEN 'CURRENT'
                WHEN ts.display_order < v_current_max_progress THEN 'COMPLETED' -- Solo menores son completed
                WHEN ts.display_order = v_current_max_progress THEN 'UNLOCKED' -- La actual máxima está desbloqueada
                ELSE 'LOCKED'
            END as state,
            (ts.display_order <= v_current_max_progress) as is_navigable
        FROM public.template_section ts
        JOIN public.assessment_section s ON ts.section_id = s.id
        WHERE ts.template_id = v_template_id
        ORDER BY ts.display_order ASC
    ) t;

    -- 4. CONSTRUIR ITEMS (Checklist de Preguntas)
    SELECT json_agg(q) INTO v_items FROM (
        SELECT 
            i.id as item_id,
            i.question_text,
            ts_item.display_order,
            -- Si ya respondió, devolvemos true/false. Si no, false.
            COALESCE(resp.response_value, false) as is_checked -- <--- CORREGIDO: response_value
        FROM public.template_section_item ts_item
        JOIN public.assessment_item i ON ts_item.item_id = i.id
        LEFT JOIN public.assessment_item_response resp 
            ON resp.item_id = i.id AND resp.instance_id = p_instance_id
        WHERE ts_item.template_section_id = (
            SELECT id FROM public.template_section 
            WHERE template_id = v_template_id AND display_order = p_section_order
        )
        ORDER BY ts_item.display_order ASC
    ) q;

    RETURN json_build_object(
        'status', 'IN_PROGRESS',
        'current_section', p_section_order,
        'stepper', v_stepper,
        'items', COALESCE(v_items, '[]'::json)
    );
END;
$$;


ALTER FUNCTION "public"."get_assessment_step"("p_instance_id" bigint, "p_section_order" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_student_lists"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_result json;
BEGIN
    SELECT json_build_object(
        
        -- LISTA 1: Mis Hijos (is_manager = true)
        'managed_students', COALESCE(
            json_agg(
                -- AQUÍ ESTÁ EL FILTRO DE CAMPOS:
                -- Solo metemos al JSON lo que tú quieres, ignorando el resto de la vista.
                json_build_object(
                    'student_id', s.student_id,
                    'full_name', s.full_name,
                    'pending_assessment_url', (
                        SELECT '/assessment/' || ari.id::text || '/' || COALESCE(ari.current_section_order, 1)::text
                        FROM public.assessment_response_instance ari
                        WHERE ari.nna_user_id = s.student_id
                          AND ari.responsible_user_id = v_user_id
                          AND ari.status != 'COMPLETED'
                        ORDER BY ari.created_at DESC
                        LIMIT 1
                    )
                ) ORDER BY s.full_name ASC
            ) FILTER (WHERE s.is_manager = true),
            '[]'::json
        ),

        -- LISTA 2: Institucionales (is_manager = false)
        'monitored_students', COALESCE(
            json_agg(
                json_build_object(
                    'student_id', s.student_id,
                    'full_name', s.full_name
                ) ORDER BY s.full_name ASC
            ) FILTER (WHERE s.is_manager = false),
            '[]'::json
        )

    ) INTO v_result
    FROM public.view_my_students s
    WHERE s.responsible_user = v_user_id;

    RETURN COALESCE(v_result, json_build_object(
        'managed_students', '[]'::json, 
        'monitored_students', '[]'::json
    ));
END;
$$;


ALTER FUNCTION "public"."get_my_student_lists"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_activity"("p_nna_user_id" "uuid", "p_current_activity_id" bigint) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_program_id bigint;
    v_current_order int;
    v_next_activity_id bigint;
BEGIN
    -- 1. Identificar contexto actual: ¿En qué programa y orden está esta actividad?
    SELECT 
        pa.program_id, 
        pa.display_order 
    INTO 
        v_program_id, 
        v_current_order
    FROM public.program_activity pa
    JOIN public.nna_program_enrollment pe ON pa.program_id = pe.program_id
    WHERE pe.nna_user_id = p_nna_user_id
      AND pa.activity_template_id = p_current_activity_id
    LIMIT 1;

    -- Si no encontramos la actividad actual (algo raro pasó), salimos.
    IF v_program_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. Buscar la SIGUIENTE actividad
    -- Lógica: Misma programa, activa, y con un orden mayor al actual.
    -- Tomamos la primera que aparezca (ASC).
    SELECT pa.activity_template_id 
    INTO v_next_activity_id
    FROM public.program_activity pa
    WHERE pa.program_id = v_program_id
      AND pa.is_active = true
      AND pa.display_order > v_current_order
    ORDER BY pa.display_order ASC
    LIMIT 1;

    RETURN v_next_activity_id;
END;
$$;


ALTER FUNCTION "public"."get_next_activity"("p_nna_user_id" "uuid", "p_current_activity_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_section_activity"("p_nna_user_id" "uuid", "p_current_activity_id" bigint) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_program_id bigint;
    v_section_id bigint;
    v_next_activity_id bigint;
BEGIN
    -- 1. Obtener contexto actual: Programa y SECCIÓN (Ignoramos el orden)
    SELECT 
        pe.program_id, 
        act.category_id
    INTO 
        v_program_id, 
        v_section_id
    FROM public.nna_program_enrollment pe
    JOIN public.program_activity pa ON pe.program_id = pa.program_id
    JOIN public.activity_template act ON pa.activity_template_id = act.id
    WHERE pe.nna_user_id = p_nna_user_id
      AND pa.activity_template_id = p_current_activity_id
    LIMIT 1;

    -- Si no encontramos datos, salir
    IF v_program_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. Buscar CUALQUIER actividad pendiente en la misma sección
    SELECT pa.activity_template_id 
    INTO v_next_activity_id
    FROM public.program_activity pa
    JOIN public.activity_template act_next ON pa.activity_template_id = act_next.id
    WHERE pa.program_id = v_program_id
      AND pa.is_active = true
      AND act_next.category_id = v_section_id 
      
      -- Excluir la actividad actual (por si acaso no se ha guardado el resultado aún)
      AND pa.activity_template_id != p_current_activity_id

      -- Excluir las YA respondidas (Esto es lo vital)
      AND NOT EXISTS (
          SELECT 1 
          FROM public.nna_activity_result res
          WHERE res.nna_user_id = p_nna_user_id
            AND res.activity_template_id = pa.activity_template_id
      )
      
    -- Como no hay orden definido, ordenamos por ID para que sea consistente
    -- (Primero la 3, luego la 4, etc.)
    ORDER BY pa.activity_template_id ASC
    LIMIT 1;

    RETURN v_next_activity_id;
END;
$$;


ALTER FUNCTION "public"."get_next_section_activity"("p_nna_user_id" "uuid", "p_current_activity_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_nna_activity_detail"("p_nna_user_id" "uuid", "p_activity_id" bigint) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
    
    -- Variables de Seguridad
    v_can_edit_relation boolean;
    v_my_subscription_id bigint;
    
    v_detail json;
BEGIN
    -- =================================================================
    -- 1. FASE DE SEGURIDAD (Gatekeeper)
    -- =================================================================

    -- A. Verificar Relación (Padre/Tutor -> Niño)
    SELECT can_edit INTO v_can_edit_relation
    FROM public.responsible_nna_user
    WHERE nna_user = p_nna_user_id 
    AND responsible_user = v_user_id;

    IF v_can_edit_relation IS NULL THEN
        RAISE EXCEPTION 'Security Violation: No tienes relación con este alumno.';
    END IF;

    -- B. Verificar Suscripción Activa y obtener ID
    SELECT id INTO v_my_subscription_id
    FROM public.subscription 
    WHERE responsible_user = v_user_id 
    AND is_active = true
    LIMIT 1;

    -- C. Validación Final
    IF (v_can_edit_relation = false OR v_my_subscription_id IS NULL) THEN
        RAISE EXCEPTION 'Acceso Restringido: Suscripción inactiva o falta de permisos.';
    END IF;

    -- =================================================================
    -- 2. FASE DE DATOS (Filtrado por Contexto)
    -- =================================================================
    
    SELECT row_to_json(t) INTO v_detail
    FROM (
        SELECT 
            activity_id,
            program_id,
            enrollment_id, -- Retornamos también el enrollment por si el front lo necesita
            instruction,
            video_url,
            question,
            objetive_specific,
            is_success,
            result_id
        FROM public.view_nna_activity_detail
        WHERE nna_user_id = p_nna_user_id
        AND activity_id = p_activity_id
        
        -- >>> FILTRO DE ORO <<<
        -- Esto fuerza a la vista a usar solo el enrollment asociado a TU pago.
        AND subscription_id = v_my_subscription_id
        
        LIMIT 1
    ) t;

    IF v_detail IS NULL THEN
        RAISE EXCEPTION 'La actividad no existe o no está disponible en tu plan actual.';
    END IF;

    RETURN v_detail;
END;
$$;


ALTER FUNCTION "public"."get_nna_activity_detail"("p_nna_user_id" "uuid", "p_activity_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_nna_dashboard_overview"("p_nna_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
    
    -- Variables Contexto
    v_can_edit_relation boolean;
    v_my_subscription_id bigint;
    v_plan_name text;
    v_subscription_active boolean := false;

    -- Variables Diagnóstico
    v_assessment_id bigint;
    v_assessment_status text;
    v_current_section bigint;
    v_redirect_url text; -- <--- NUEVA VARIABLE

    -- Salida
    v_flag_can_edit_profile boolean;
    v_flag_can_view_activities boolean;
    v_student_info json;
    v_progress_stats json;
BEGIN
    -- 1. SEGURIDAD (Gatekeeper)
    SELECT can_edit INTO v_can_edit_relation
    FROM public.responsible_nna_user
    WHERE nna_user = p_nna_user_id AND responsible_user = v_user_id;

    IF v_can_edit_relation IS NULL THEN
        RAISE EXCEPTION 'Security Violation: No tienes acceso a este alumno.';
    END IF;

    -- 2. SUSCRIPCIÓN
    SELECT s.id, sp.name INTO v_my_subscription_id, v_plan_name
    FROM public.subscription s
    JOIN public.subscription_plan sp ON s.suscription_plan_id = sp.id
    WHERE s.responsible_user = v_user_id AND s.is_active = true
    ORDER BY s.created_at DESC LIMIT 1;

    IF v_my_subscription_id IS NOT NULL THEN
        v_subscription_active := true;
    ELSE
        v_plan_name := 'Sin Plan Activo';
    END IF;

    v_flag_can_edit_profile := v_can_edit_relation;
    v_flag_can_view_activities := (v_can_edit_relation = true AND v_subscription_active = true);

    -- Info Estudiante
    SELECT json_build_object(
        'id', id,
        'first_name', first_name,
        'last_name', last_name,
        'birthdate', birthdate,
        'sex', sex,
        'age_years', EXTRACT(YEAR FROM age(birthdate))::int,
        'plan_name', v_plan_name,
        'has_active_plan', v_subscription_active
    ) INTO v_student_info
    FROM public.nna_user
    WHERE id = p_nna_user_id;

    -- 3. SEMÁFORO DE DIAGNÓSTICO (Con Redirección Automática)
    IF v_subscription_active THEN
        
        -- Buscamos el último diagnóstico del usuario para este niño
        SELECT 
            id, status::text, COALESCE(current_section_order, 1) -- Default a sección 1 si es nuevo
        INTO 
            v_assessment_id, v_assessment_status, v_current_section
        FROM public.assessment_response_instance
        WHERE nna_user_id = p_nna_user_id
        AND responsible_user_id = v_user_id
        ORDER BY created_at DESC
        LIMIT 1;

        -- CASO: REDIRECT (No existe o Incompleto)
        IF v_assessment_id IS NULL OR v_assessment_status != 'COMPLETED' THEN
            
            -- Si no existe instancia, el front deberá manejar la creación de una nueva
            -- Pero si existe (PENDING), construimos la URL: "/assessment/105/3"
            IF v_assessment_id IS NOT NULL THEN
                v_redirect_url := '/assessment/' || v_assessment_id::text || '/' || v_current_section::text;
            ELSE
                -- Caso especial: Nunca ha empezado. El front debe enviarlo al "Intro" o crear uno.
                v_redirect_url := '/assessment/new'; 
            END IF;

            RETURN json_build_object(
                'student', v_student_info,
                'view_mode', 'REDIRECT', -- Flag explícita
                'redirect_url', v_redirect_url, -- La URL lista para usar
                'permissions', json_build_object(
                    'can_edit_profile', v_flag_can_edit_profile,
                    'can_view_activities', v_flag_can_view_activities
                ),
                'progress_metrics', '[]'::json
            );
        END IF;
    END IF;

    -- 4. DASHBOARD VIEW (Solo si es COMPLETED)
    IF v_subscription_active THEN
        SELECT COALESCE(json_agg(v), '[]'::json) INTO v_progress_stats
        FROM public.view_nna_dynamic_progress v
        WHERE v.nna_user_id = p_nna_user_id
        AND v.subscription_id = v_my_subscription_id; 
    ELSE
        v_progress_stats := '[]'::json;
    END IF;

    RETURN json_build_object(
        'student', v_student_info,
        'view_mode', 'DASHBOARD_VIEW',
        'permissions', json_build_object(
            'can_edit_profile', v_flag_can_edit_profile,
            'can_view_activities', v_flag_can_view_activities
        ),
        'progress_metrics', v_progress_stats
    );
END;
$$;


ALTER FUNCTION "public"."get_nna_dashboard_overview"("p_nna_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_nna_section_activities"("p_nna_user_id" "uuid", "p_section_id" bigint) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
    
    -- Variables de Contexto
    v_can_edit_relation boolean;
    v_my_subscription_id bigint; -- Guardamos el ID para el filtro
    
    v_activities json;
BEGIN
    -- =================================================================
    -- 1. FASE DE SEGURIDAD (Gatekeeper)
    -- =================================================================
    
    -- A. Verificar Relación
    SELECT can_edit INTO v_can_edit_relation
    FROM public.responsible_nna_user
    WHERE nna_user = p_nna_user_id 
    AND responsible_user = v_user_id;

    IF v_can_edit_relation IS NULL THEN
        RAISE EXCEPTION 'Security Violation: No tienes relación con este alumno.';
    END IF;

    -- B. Verificar Suscripción y obtener ID
    SELECT id INTO v_my_subscription_id
    FROM public.subscription 
    WHERE responsible_user = v_user_id 
    AND is_active = true
    LIMIT 1;

    -- Validación Combinada
    IF (v_can_edit_relation = false OR v_my_subscription_id IS NULL) THEN
        RAISE EXCEPTION 'Acceso Restringido: Suscripción inactiva o falta de permisos.';
    END IF;

    -- =================================================================
    -- 2. FASE DE DATOS (Filtrado por Suscripción)
    -- =================================================================
    
    SELECT json_agg(
        json_build_object(
            'activity_id', t.activity_id,
            'is_success', t.is_success
            -- Puedes agregar 'instruction' aquí si lo necesitas en la lista
        ) ORDER BY t.display_order ASC
    ) INTO v_activities
    FROM public.view_nna_section_activities t
    WHERE t.nna_user_id = p_nna_user_id
    AND t.section_id = p_section_id
    
    -- >>> EL FILTRO DE ORO <<<
    -- Asegura que solo veas las actividades del programa que TÚ pagas
    AND t.subscription_id = v_my_subscription_id;

    RETURN COALESCE(v_activities, '[]'::json);
END;
$$;


ALTER FUNCTION "public"."get_nna_section_activities"("p_nna_user_id" "uuid", "p_section_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_registration"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_role_id bigint;
BEGIN
    -- ==============================================================================
    -- 1. CREAR EL PERFIL UNIVERSAL (responsible_user)
    -- ==============================================================================
    -- Creamos la entrada en tu tabla de perfiles para TODOS los usuarios nuevos.
    INSERT INTO public.responsible_user (id) 
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;

    -- ==============================================================================
    -- 2. ASIGNAR ROL POR DEFECTO ('individual_client')
    -- ==============================================================================
    -- Buscamos el ID del rol de Cliente Individual (Padre/Tutor).
    SELECT id INTO v_role_id FROM public.role WHERE name = 'individual_client' LIMIT 1;

    -- Lo asignamos automáticamente a todos.
    -- (Si más adelante quieres que sea profesor, lo cambias tú manualmente en la BD o Admin Panel)
    IF v_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, rol_id) 
        VALUES (NEW.id, v_role_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- ==============================================================================
    -- 3. PROCESAR LA SALA DE ESPERA (nna_invitation)
    -- ==============================================================================
    -- Esto sigue siendo vital: Si el usuario se registra con un email que ya
    -- había sido invitado (por Excel o manual), lo vinculamos al niño.
    INSERT INTO public.responsible_nna_user (nna_user, responsible_user, can_edit)
    SELECT 
        inv.nna_user_id,   -- El niño
        NEW.id,            -- El nuevo usuario (Papá/Mamá)
        false              -- Solo lectura
    FROM public.nna_invitation inv
    WHERE LOWER(inv.email) = LOWER(NEW.email);

    -- Limpiamos las invitaciones ya procesadas
    DELETE FROM public.nna_invitation 
    WHERE LOWER(email) = LOWER(NEW.email);

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_registration"() OWNER TO "postgres";


CREATE OR REPLACE TRIGGER "on_auth_user_created"
    AFTER INSERT ON "auth"."users"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_registration"();


CREATE OR REPLACE FUNCTION "public"."init_student_diagnosis"("p_first_name" "text", "p_last_name" "text", "p_birthdate" "date", "p_sex" "public"."sex") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_nna_id uuid;
    v_template_id bigint;
    v_instance_id bigint;
    v_assessment_allowed boolean;
    
    -- Nuevas variables para la lógica de roles
    v_user_role_name text;
    v_target_template_type public.assessment_types; -- Variable del tipo ENUM
    v_subscription_id bigint;
    v_program_id bigint;
BEGIN
    -- 1. Validaciones Básicas
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

    -- 2. Crear Alumno (NNA) - ESTO SIEMPRE OCURRE
    INSERT INTO public.nna_user (first_name, last_name, birthdate, sex)
    VALUES (p_first_name, p_last_name, p_birthdate, p_sex)
    RETURNING id INTO v_nna_id;

    -- 3. Vincular al Padre - ESTO SIEMPRE OCURRE
    INSERT INTO public.responsible_nna_user (nna_user, responsible_user, can_edit)
    VALUES (v_nna_id, v_user_id, true);

    -- 3.5. Crear Enrollment en el Programa
    SELECT s.id INTO v_subscription_id
    FROM public.subscription s
    WHERE s.responsible_user = v_user_id
    AND s.is_active = true
    LIMIT 1;

    SELECT id INTO v_program_id
    FROM public.program_template
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_subscription_id IS NOT NULL AND v_program_id IS NOT NULL THEN
        INSERT INTO public.nna_program_enrollment (nna_user_id, program_id, subscription_id)
        VALUES (v_nna_id, v_program_id, v_subscription_id);
    END IF;

    -- 4. VERIFICAR PERMISOS DEL PLAN
    SELECT EXISTS (
        SELECT 1 
        FROM public.subscription s
        JOIN public.subscription_plan sp ON s.suscription_plan_id = sp.id
        WHERE s.responsible_user = v_user_id 
        AND s.is_active = true
        AND sp.assessment_allowed = true
    ) INTO v_assessment_allowed;

    -- 5. LÓGICA DE RAMIFICACIÓN
    IF v_assessment_allowed THEN
        
        -- RAMA A: Plan permite Diagnóstico
        -- ---------------------------------------------------

        -- >>> NUEVO: Determinar el tipo de Template según el Rol <<<
        
        -- A0.1 Obtener nombre del Rol
        SELECT r.name INTO v_user_role_name
        FROM public.role r
        JOIN public.user_roles ur ON r.id = ur.rol_id
        WHERE ur.user_id = v_user_id
        LIMIT 1;

        -- A0.2 Asignar el ENUM correcto
        CASE v_user_role_name
            WHEN 'teacher' THEN
                v_target_template_type := 'INSTITUTION'::public.assessment_types;
            WHEN 'individual_client' THEN
                v_target_template_type := 'PERSONAL'::public.assessment_types;
            ELSE
                -- Fallback por defecto (seguridad)
                v_target_template_type := 'PERSONAL'::public.assessment_types;
        END CASE;

        -- A1. Buscar Template Activo (Ahora filtrando por v_target_template_type)
        SELECT id INTO v_template_id
        FROM public.assessment_template
        WHERE is_active = true 
        AND type = v_target_template_type -- <--- Aquí usamos la variable dinámica
        ORDER BY created_at DESC LIMIT 1;

        IF v_template_id IS NULL THEN
            -- Edge Case: Tiene plan pero no hay template de ese tipo configurado
            RETURN json_build_object(
                'student_id', v_nna_id,
                'instance_id', null,
                'redirect_url', '/dashboard'
            );
        END IF;

        -- A2. Crear Instancia
        INSERT INTO public.assessment_response_instance (
            nna_user_id, responsible_user_id, template_id, status, current_section_order
        )
        VALUES (
            v_nna_id, v_user_id, v_template_id, 'IN_PROGRESS', 1
        )
        RETURNING id INTO v_instance_id;

        -- A3. Redirigir al Diagnóstico
        RETURN json_build_object(
            'student_id', v_nna_id,
            'instance_id', v_instance_id,
            'redirect_url', '/assessment/' || v_instance_id || '/1'
        );

    ELSE
        
        -- RAMA B: Plan NO permite Diagnóstico
        -- ---------------------------------------------------
        RETURN json_build_object(
            'student_id', v_nna_id,
            'instance_id', null,
            'redirect_url', '/dashboard'
        );
        
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE; 
END;
$$;


ALTER FUNCTION "public"."init_student_diagnosis"("p_first_name" "text", "p_last_name" "text", "p_birthdate" "date", "p_sex" "public"."sex") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_activity_result"("p_nna_user_id" "uuid", "p_activity_id" bigint, "p_result" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
    
    -- Variables de Contexto
    v_my_subscription_id bigint;
    v_target_enrollment_id bigint;
BEGIN
    -- =================================================================
    -- 1. FASE DE SEGURIDAD Y CONTEXTO
    -- =================================================================

    -- A. Verificar Relación y Permisos de Edición
    PERFORM 1 FROM public.responsible_nna_user 
    WHERE nna_user = p_nna_user_id 
    AND responsible_user = v_user_id
    AND can_edit = true; -- <--- Solo quien tiene permiso 'can_edit' puede guardar
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Security Violation: No tienes permisos de edición sobre este alumno.';
    END IF;

    -- B. Obtener mi Suscripción Activa
    SELECT id INTO v_my_subscription_id
    FROM public.subscription 
    WHERE responsible_user = v_user_id 
    AND is_active = true
    LIMIT 1;

    IF v_my_subscription_id IS NULL THEN
        RAISE EXCEPTION 'Acceso Restringido: Necesitas una suscripción activa para guardar progreso.';
    END IF;

    -- =================================================================
    -- 2. RESOLUCIÓN DE ENROLLMENT (La Magia)
    -- =================================================================
    
    -- Buscamos AUTOMÁTICAMENTE a qué contrato pertenece esta actividad
    -- basándonos en: El Niño + Mi Suscripción + Que la actividad esté en el programa.
    SELECT pe.id INTO v_target_enrollment_id
    FROM public.nna_program_enrollment pe
    JOIN public.program_activity pa ON pe.program_id = pa.program_id
    WHERE pe.nna_user_id = p_nna_user_id
    AND pe.subscription_id = v_my_subscription_id  -- <--- Filtro Clave: Mi Plan
    AND pa.activity_template_id = p_activity_id      -- <--- Filtro Clave: Esta Actividad
    LIMIT 1;

    IF v_target_enrollment_id IS NULL THEN
        RAISE EXCEPTION 'Error de Integridad: El alumno no tiene esta actividad asignada en tu plan actual.';
    END IF;

    -- =================================================================
    -- 3. ESCRITURA (Upsert)
    -- =================================================================

    INSERT INTO public.nna_activity_result (
        nna_user_id,             -- Mantenemos redundancia por performance en lecturas simples
        program_enrollment_id,   -- <--- EL DATO CRÍTICO
        activity_template_id, 
        result, 
        created_at
    )
    VALUES (
        p_nna_user_id,
        v_target_enrollment_id, 
        p_activity_id, 
        p_result, 
        now()
    )
    ON CONFLICT (program_enrollment_id, activity_template_id) 
    DO UPDATE SET 
        result = EXCLUDED.result, -- Actualizamos si cambió de false a true (o viceversa)
        created_at = now();       -- Actualizamos la fecha de última modificación

    RETURN true;
END;
$$;


ALTER FUNCTION "public"."save_activity_result"("p_nna_user_id" "uuid", "p_activity_id" bigint, "p_result" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_activity_result"("p_nna_user_id" "uuid", "p_activity_id" bigint, "p_result" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_program_id bigint;
    v_can_edit boolean;
BEGIN
    -- 1. SEGURIDAD: Verificar permisos del Usuario sobre el Alumno
    -- Consultamos si existe la relación y si tiene permiso de edición.
    SELECT can_edit INTO v_can_edit
    FROM public.responsible_nna_user
    WHERE nna_user = p_nna_user_id 
    AND responsible_user = v_user_id;

    -- Validación estricta: Si no hay relación O can_edit es falso, bloqueamos.
    -- (Esto cubre el caso de "Solo Lectura" o usuarios ajenos)
    IF v_can_edit IS NULL OR v_can_edit = false THEN
        RAISE EXCEPTION 'Acceso denegado: No tienes permisos para registrar actividades de este alumno.';
    END IF;

    -- NOTA: La validación de "Suscripción Activa" se suele manejar en la capa de lectura (dashboard)
    -- para ocultar la UI. Sin embargo, si can_edit se actualiza automáticamente a false
    -- cuando la suscripción caduca, esta validación de arriba ya es suficiente.

    -- 2. Buscamos el program_id activo del niño
    -- (Asumimos que el niño tiene un enrolamiento activo en algún programa)
    SELECT program_id INTO v_program_id
    FROM public.nna_program_enrollment
    WHERE nna_user_id = p_nna_user_id
    LIMIT 1;

    -- Validación: Si no tiene programa, lanzamos error
    IF v_program_id IS NULL THEN
        RAISE EXCEPTION 'El usuario no está inscrito en ningún programa.';
    END IF;

    -- 3. Hacemos el UPSERT (Insertar o Actualizar)
    -- Si ya existe un resultado para este niño y esta actividad, actualizamos el valor.
    INSERT INTO public.nna_activity_result (
        nna_user_id, 
        activity_template_id, 
        program_id, 
        result, 
        created_at
    )
    VALUES (
        p_nna_user_id, 
        p_activity_id, 
        v_program_id, 
        p_result, 
        now()
    )
    ON CONFLICT (nna_user_id, activity_template_id) 
    DO UPDATE SET 
        result = EXCLUDED.result,
        created_at = now(); -- Actualizamos la fecha a la del último intento

    RETURN true;
END;
$$;


ALTER FUNCTION "public"."submit_activity_result"("p_nna_user_id" "uuid", "p_activity_id" bigint, "p_result" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_section_response"("p_instance_id" bigint, "p_section_order" integer, "p_responses" json) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_template_id bigint;
    v_current_max_progress int;
    v_total_sections int;
    v_response_item json;
    v_is_owner boolean;
BEGIN
    -- 1. SEGURIDAD: Verificar propiedad de la instancia
    SELECT EXISTS (
        SELECT 1 FROM public.assessment_response_instance i
        JOIN public.responsible_nna_user r ON i.nna_user_id = r.nna_user
        WHERE i.id = p_instance_id
        AND r.responsible_user = v_user_id
        AND r.can_edit = true
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN 
        RAISE EXCEPTION 'Acceso denegado a esta evaluación.'; 
    END IF;

    -- 2. GUARDADO MASIVO (Bulk Upsert)
    FOR v_response_item IN SELECT * FROM json_array_elements(p_responses)
    LOOP
        INSERT INTO public.assessment_item_response (instance_id, item_id, response_value, updated_at)
        VALUES (
            p_instance_id,
            (v_response_item->>'item_id')::bigint,
            (v_response_item->>'value')::boolean,
            now()
        )
        ON CONFLICT (instance_id, item_id)
        DO UPDATE SET
            response_value = EXCLUDED.response_value,
            updated_at = now();
    END LOOP;

    -- 3. CALCULAR PROGRESO
    SELECT template_id, current_section_order 
    INTO v_template_id, v_current_max_progress
    FROM public.assessment_response_instance 
    WHERE id = p_instance_id;

    SELECT COUNT(*) INTO v_total_sections 
    FROM public.template_section 
    WHERE template_id = v_template_id;

    -- 4. DECISIÓN DE NAVEGACIÓN
    IF p_section_order >= v_total_sections THEN
        
        -- A. FIN DEL JUEGO (Era la última sección)
        -- Marcamos como COMPLETED
        UPDATE public.assessment_response_instance 
        SET status = 'COMPLETED', completed_at = now(), current_section_order = v_total_sections
        WHERE id = p_instance_id;
        
        -- Retornamos la ruta base única. El Frontend se encarga del resto.
        RETURN json_build_object(
            'action', 'FINISH', 
            'redirect_url', '/dashboard' 
        );
    
    ELSE
        -- B. AVANZAR (Hay más secciones)
        IF p_section_order >= v_current_max_progress THEN
            UPDATE public.assessment_response_instance 
            SET current_section_order = p_section_order + 1
            WHERE id = p_instance_id;
        END IF;

        RETURN json_build_object(
            'action', 'NEXT_SECTION',
            'redirect_url', '/assessment/' || p_instance_id || '/' || (p_section_order + 1)
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."submit_section_response"("p_instance_id" bigint, "p_section_order" integer, "p_responses" json) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_age_objetive" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "activity_template_id" bigint,
    "age_top_range" bigint,
    "objetive_text" "text"
);


ALTER TABLE "public"."activity_age_objetive" OWNER TO "postgres";


ALTER TABLE "public"."activity_age_objetive" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."activity_age_objetive_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."activity_template" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category_id" bigint NOT NULL,
    "objetive_general" "text",
    "instruction" "text" NOT NULL,
    "video_url" "text",
    "question" "text"
);


ALTER TABLE "public"."activity_template" OWNER TO "postgres";


ALTER TABLE "public"."activity_template" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."activity_template_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."assessment_item" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "question_text" "text"
);


ALTER TABLE "public"."assessment_item" OWNER TO "postgres";


ALTER TABLE "public"."assessment_item" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."assessment_item_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."assessment_item_response" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "item_id" bigint,
    "response_value" boolean,
    "instance_id" bigint,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."assessment_item_response" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_response_instance" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responsible_user_id" "uuid" NOT NULL,
    "nna_user_id" "uuid" NOT NULL,
    "template_id" bigint NOT NULL,
    "status" "public"."assessment_status" DEFAULT 'PENDING'::"public"."assessment_status" NOT NULL,
    "current_section_order" bigint,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."assessment_response_instance" OWNER TO "postgres";


ALTER TABLE "public"."assessment_response_instance" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."assessment_response_instance_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."assessment_section" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."assessment_section" OWNER TO "postgres";


ALTER TABLE "public"."assessment_section" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."assessment_section_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."assessment_template" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean,
    "version" "text",
    "type" "public"."assessment_types"
);


ALTER TABLE "public"."assessment_template" OWNER TO "postgres";


ALTER TABLE "public"."assessment_template" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."assessment_template_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."course" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "institution_id" bigint,
    "name" "text",
    "student_limit" bigint
);


ALTER TABLE "public"."course" OWNER TO "postgres";


ALTER TABLE "public"."course" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."course_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."course_teacher" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "course_id" bigint,
    "teacher_id" "uuid"
);


ALTER TABLE "public"."course_teacher" OWNER TO "postgres";


ALTER TABLE "public"."course_teacher" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."course_teacher_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."institution" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "is_active" boolean
);


ALTER TABLE "public"."institution" OWNER TO "postgres";


ALTER TABLE "public"."institution" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."institution_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."nna_activity_result" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "activity_template_id" bigint NOT NULL,
    "result" boolean NOT NULL,
    "nna_user_id" "uuid" NOT NULL,
    "program_enrollment_id" bigint
);


ALTER TABLE "public"."nna_activity_result" OWNER TO "postgres";


ALTER TABLE "public"."nna_activity_result" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."nna_activity_result_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."assessment_item_response" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."nna_assessment_response_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."nna_invitation" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nna_user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "invited_by_user_id" "uuid"
);


ALTER TABLE "public"."nna_invitation" OWNER TO "postgres";


ALTER TABLE "public"."nna_invitation" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."nna_invitation_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."nna_program_enrollment" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nna_user_id" "uuid",
    "program_id" bigint,
    "subscription_id" bigint
);


ALTER TABLE "public"."nna_program_enrollment" OWNER TO "postgres";


ALTER TABLE "public"."nna_program_enrollment" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."nna_program_enrollment_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."nna_subscription_enrollment" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nna_user" "uuid",
    "subscription" bigint
);


ALTER TABLE "public"."nna_subscription_enrollment" OWNER TO "postgres";


ALTER TABLE "public"."nna_subscription_enrollment" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."nna_subscription_enrollment_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."nna_user" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "course_id" bigint,
    "sex" "public"."sex",
    "birthdate" "date"
);


ALTER TABLE "public"."nna_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "type" "text" NOT NULL,
    "is_read" boolean NOT NULL
);


ALTER TABLE "public"."notification" OWNER TO "postgres";


ALTER TABLE "public"."notification" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."notification_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."payment" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subscription" bigint,
    "amount" numeric
);


ALTER TABLE "public"."payment" OWNER TO "postgres";


ALTER TABLE "public"."payment" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."payment_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."program_activity" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "program_id" bigint,
    "activity_template_id" bigint,
    "display_order" bigint,
    "is_active" boolean
);


ALTER TABLE "public"."program_activity" OWNER TO "postgres";


ALTER TABLE "public"."program_activity" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."program_activity_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."program_template" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" "text",
    "name" "text",
    "is_active" boolean,
    "star_percentage" bigint
);


ALTER TABLE "public"."program_template" OWNER TO "postgres";


ALTER TABLE "public"."program_template" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."program_activity_template_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."responsible_nna_user" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nna_user" "uuid",
    "responsible_user" "uuid",
    "can_edit" boolean
);


ALTER TABLE "public"."responsible_nna_user" OWNER TO "postgres";


ALTER TABLE "public"."responsible_nna_user" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."responsible_nna_user_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."responsible_user" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "institution_id" bigint
);


ALTER TABLE "public"."responsible_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."role" OWNER TO "postgres";


ALTER TABLE "public"."role" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."role_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."subscription" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "suscription_plan_id" bigint,
    "responsible_user" "uuid",
    "effective_max_nna_allowed" bigint,
    "is_active" boolean,
    "institution_id" bigint
);


ALTER TABLE "public"."subscription" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plan" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "duration_days" bigint,
    "price" numeric,
    "max_nna_allowed" bigint,
    "assessment_allowed" boolean,
    "plan_group" "text"
);


ALTER TABLE "public"."subscription_plan" OWNER TO "postgres";


ALTER TABLE "public"."subscription_plan" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."suscription_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."subscription" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."suscription_id_seq1"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."template_section" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "template_id" bigint,
    "section_id" bigint,
    "display_order" bigint
);


ALTER TABLE "public"."template_section" OWNER TO "postgres";


ALTER TABLE "public"."template_section" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."template_section_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."template_section_item" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "template_section_id" bigint,
    "item_id" bigint,
    "display_order" bigint
);


ALTER TABLE "public"."template_section_item" OWNER TO "postgres";


ALTER TABLE "public"."template_section_item" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."template_section_item_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "rol_id" bigint
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE "public"."user_roles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_roles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."view_my_students" WITH ("security_invoker"='true') AS
 SELECT "r"."responsible_user",
    "r"."can_edit" AS "is_manager",
    "n"."id" AS "student_id",
    (("n"."first_name" || ' '::"text") || "n"."last_name") AS "full_name"
   FROM ("public"."responsible_nna_user" "r"
     JOIN "public"."nna_user" "n" ON (("r"."nna_user" = "n"."id")));


ALTER VIEW "public"."view_my_students" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_nna_active_sections" WITH ("security_invoker"='true') AS
 SELECT "pe"."nna_user_id",
    "sec"."id" AS "section_id",
    "sec"."name" AS "section_name",
    "count"("pa"."activity_template_id") AS "total_activities",
    "count"("res"."activity_template_id") AS "completed_activities",
        CASE
            WHEN ("count"("pa"."activity_template_id") > 0) THEN "round"(((("count"("res"."activity_template_id"))::numeric / ("count"("pa"."activity_template_id"))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "progress_percentage"
   FROM (((("public"."nna_program_enrollment" "pe"
     JOIN "public"."program_activity" "pa" ON (("pe"."program_id" = "pa"."program_id")))
     JOIN "public"."activity_template" "act" ON (("pa"."activity_template_id" = "act"."id")))
     JOIN "public"."assessment_section" "sec" ON (("act"."category_id" = "sec"."id")))
     LEFT JOIN "public"."nna_activity_result" "res" ON ((("res"."nna_user_id" = "pe"."nna_user_id") AND ("res"."activity_template_id" = "act"."id"))))
  WHERE ("pa"."is_active" = true)
  GROUP BY "pe"."nna_user_id", "sec"."id", "sec"."name";


ALTER VIEW "public"."view_nna_active_sections" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_nna_activity_detail" WITH ("security_invoker"='true') AS
 SELECT "pe"."nna_user_id",
    "pe"."subscription_id",
    "pe"."program_id",
    "pe"."id" AS "enrollment_id",
    "act"."id" AS "activity_id",
    "act"."instruction",
    "act"."video_url",
    "act"."question",
    "res"."result" AS "is_success",
    "res"."id" AS "result_id",
    COALESCE("fitting_age"."objetive_text", "ceiling_age"."objetive_text", "act"."objetive_general") AS "objetive_specific"
   FROM (((((("public"."nna_program_enrollment" "pe"
     JOIN "public"."nna_user" "u" ON (("pe"."nna_user_id" = "u"."id")))
     JOIN "public"."program_activity" "pa" ON (("pe"."program_id" = "pa"."program_id")))
     JOIN "public"."activity_template" "act" ON (("pa"."activity_template_id" = "act"."id")))
     LEFT JOIN "public"."nna_activity_result" "res" ON ((("res"."program_enrollment_id" = "pe"."id") AND ("res"."activity_template_id" = "act"."id"))))
     LEFT JOIN LATERAL ( SELECT "aao"."objetive_text"
           FROM "public"."activity_age_objetive" "aao"
          WHERE (("aao"."activity_template_id" = "act"."id") AND (("aao"."age_top_range")::numeric >= EXTRACT(year FROM "age"((CURRENT_DATE)::timestamp with time zone, ("u"."birthdate")::timestamp with time zone))))
          ORDER BY "aao"."age_top_range"
         LIMIT 1) "fitting_age" ON (true))
     LEFT JOIN LATERAL ( SELECT "aao"."objetive_text"
           FROM "public"."activity_age_objetive" "aao"
          WHERE ("aao"."activity_template_id" = "act"."id")
          ORDER BY "aao"."age_top_range" DESC
         LIMIT 1) "ceiling_age" ON (true));


ALTER VIEW "public"."view_nna_activity_detail" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_nna_dynamic_progress" WITH ("security_invoker"='true') AS
 WITH "assessment_stats" AS (
         SELECT "ari"."nna_user_id",
            "ari"."responsible_user_id",
            "ts"."section_id",
            "ts"."display_order",
            (("sum"(
                CASE
                    WHEN ("air"."response_value" = true) THEN 1
                    ELSE 0
                END))::numeric / (NULLIF("count"("air"."id"), 0))::numeric) AS "initial_score"
           FROM (((("public"."assessment_response_instance" "ari"
             JOIN "public"."assessment_item_response" "air" ON (("air"."instance_id" = "ari"."id")))
             JOIN "public"."assessment_item" "ai" ON (("air"."item_id" = "ai"."id")))
             JOIN "public"."template_section_item" "tsi" ON (("ai"."id" = "tsi"."item_id")))
             JOIN "public"."template_section" "ts" ON ((("tsi"."template_section_id" = "ts"."id") AND ("ts"."template_id" = "ari"."template_id"))))
          WHERE ("ari"."status" = 'COMPLETED'::"public"."assessment_status")
          GROUP BY "ari"."nna_user_id", "ari"."responsible_user_id", "ts"."section_id", "ts"."display_order"
        ), "program_stats" AS (
         SELECT "pe"."nna_user_id",
            "pe"."subscription_id",
            "pe"."id" AS "enrollment_id",
            "sub"."responsible_user" AS "subscription_owner",
            "sec"."id" AS "section_id",
            "sec"."name" AS "section_name",
            COALESCE("prog"."star_percentage", (0)::bigint) AS "star_percentage_target",
            "count"("pa"."id") AS "total_activities",
            "count"("res"."id") AS "activities_attempted",
                CASE
                    WHEN ("count"("res"."id") > 0) THEN (("sum"(
                    CASE
                        WHEN ("res"."result" = true) THEN 1
                        ELSE 0
                    END))::numeric / ("count"("res"."id"))::numeric)
                    ELSE (0)::numeric
                END AS "quality_score"
           FROM (((((("public"."nna_program_enrollment" "pe"
             JOIN "public"."subscription" "sub" ON (("pe"."subscription_id" = "sub"."id")))
             JOIN "public"."program_template" "prog" ON (("pe"."program_id" = "prog"."id")))
             JOIN "public"."program_activity" "pa" ON (("pe"."program_id" = "pa"."program_id")))
             JOIN "public"."activity_template" "act" ON (("pa"."activity_template_id" = "act"."id")))
             JOIN "public"."assessment_section" "sec" ON (("act"."category_id" = "sec"."id")))
             LEFT JOIN "public"."nna_activity_result" "res" ON ((("res"."program_enrollment_id" = "pe"."id") AND ("res"."activity_template_id" = "act"."id"))))
          WHERE ("pa"."is_active" = true)
          GROUP BY "pe"."nna_user_id", "pe"."subscription_id", "pe"."id", "sub"."responsible_user", "sec"."id", "sec"."name", "prog"."star_percentage"
        ), "calculated_metrics" AS (
         SELECT "ps"."nna_user_id",
            "ps"."subscription_id",
            "ps"."section_id",
            "ps"."section_name",
            COALESCE("asm"."display_order", (999)::bigint) AS "section_order",
            "ps"."star_percentage_target",
            "ps"."activities_attempted",
            "ps"."total_activities",
            "round"(COALESCE(((("ps"."activities_attempted")::numeric / (NULLIF("ps"."total_activities", 0))::numeric) * (100)::numeric), (0)::numeric), 2) AS "section_progress_percentage",
            "round"(COALESCE((((COALESCE("asm"."initial_score", (0)::numeric) * ((1)::numeric - (("ps"."activities_attempted")::numeric / (NULLIF("ps"."total_activities", 0))::numeric))) + ("ps"."quality_score" * (("ps"."activities_attempted")::numeric / (NULLIF("ps"."total_activities", 0))::numeric))) * (100)::numeric), (COALESCE("asm"."initial_score", (0)::numeric) * (100)::numeric)), 2) AS "dynamic_percentage"
           FROM ("program_stats" "ps"
             LEFT JOIN "assessment_stats" "asm" ON ((("ps"."nna_user_id" = "asm"."nna_user_id") AND ("ps"."section_id" = "asm"."section_id") AND ("ps"."subscription_owner" = "asm"."responsible_user_id"))))
        )
 SELECT "nna_user_id",
    "subscription_id",
    "section_id",
    "section_name",
    "section_order",
    "activities_attempted",
    "total_activities",
    "section_progress_percentage",
    "dynamic_percentage",
        CASE
            WHEN ("dynamic_percentage" >= ("star_percentage_target")::numeric) THEN true
            ELSE false
        END AS "has_star"
   FROM "calculated_metrics"
  ORDER BY "section_order";


ALTER VIEW "public"."view_nna_dynamic_progress" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_nna_section_activities" WITH ("security_invoker"='true') AS
 SELECT "pe"."nna_user_id",
    "pe"."subscription_id",
    "pe"."id" AS "enrollment_id",
    "act"."category_id" AS "section_id",
    "pa"."display_order",
    "act"."id" AS "activity_id",
    "act"."instruction",
    "res"."result" AS "is_success"
   FROM ((("public"."nna_program_enrollment" "pe"
     JOIN "public"."program_activity" "pa" ON (("pe"."program_id" = "pa"."program_id")))
     JOIN "public"."activity_template" "act" ON (("pa"."activity_template_id" = "act"."id")))
     LEFT JOIN "public"."nna_activity_result" "res" ON ((("res"."program_enrollment_id" = "pe"."id") AND ("res"."activity_template_id" = "act"."id"))))
  WHERE ("pa"."is_active" = true)
  ORDER BY "pa"."display_order";


ALTER VIEW "public"."view_nna_section_activities" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_age_objetive"
    ADD CONSTRAINT "activity_age_objetive_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_template"
    ADD CONSTRAINT "activity_template_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_item"
    ADD CONSTRAINT "assessment_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_response_instance"
    ADD CONSTRAINT "assessment_response_instance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_section"
    ADD CONSTRAINT "assessment_section_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_template"
    ADD CONSTRAINT "assessment_template_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course"
    ADD CONSTRAINT "course_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_teacher"
    ADD CONSTRAINT "course_teacher_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."institution"
    ADD CONSTRAINT "institution_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nna_activity_result"
    ADD CONSTRAINT "nna_activity_result_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_item_response"
    ADD CONSTRAINT "nna_assessment_response_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nna_invitation"
    ADD CONSTRAINT "nna_invitation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nna_program_enrollment"
    ADD CONSTRAINT "nna_program_enrollment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nna_subscription_enrollment"
    ADD CONSTRAINT "nna_subscription_enrollment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nna_user"
    ADD CONSTRAINT "nna_user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification"
    ADD CONSTRAINT "notification_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "payment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_activity"
    ADD CONSTRAINT "program_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_template"
    ADD CONSTRAINT "program_activity_template_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."responsible_nna_user"
    ADD CONSTRAINT "responsible_nna_user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."responsible_user"
    ADD CONSTRAINT "responsible_user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role"
    ADD CONSTRAINT "role_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plan"
    ADD CONSTRAINT "suscription_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "suscription_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_section_item"
    ADD CONSTRAINT "template_section_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_section"
    ADD CONSTRAINT "template_section_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nna_activity_result"
    ADD CONSTRAINT "unique_nna_activity_combination" UNIQUE ("nna_user_id", "activity_template_id");



ALTER TABLE ONLY "public"."nna_invitation"
    ADD CONSTRAINT "unique_nna_invite" UNIQUE ("nna_user_id", "email");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_nna_invite_email" ON "public"."nna_invitation" USING "btree" ("email");



CREATE UNIQUE INDEX "idx_nna_result_enrollment_activity" ON "public"."nna_activity_result" USING "btree" ("program_enrollment_id", "activity_template_id");



ALTER TABLE ONLY "public"."activity_age_objetive"
    ADD CONSTRAINT "activity_age_objetive_activity_template_id_fkey" FOREIGN KEY ("activity_template_id") REFERENCES "public"."activity_template"("id");



ALTER TABLE ONLY "public"."activity_template"
    ADD CONSTRAINT "activity_template_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."assessment_section"("id");



ALTER TABLE ONLY "public"."assessment_item_response"
    ADD CONSTRAINT "assessment_item_response_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."assessment_response_instance"("id");



ALTER TABLE ONLY "public"."assessment_response_instance"
    ADD CONSTRAINT "assessment_response_instance_nna_user_id_fkey" FOREIGN KEY ("nna_user_id") REFERENCES "public"."nna_user"("id");



ALTER TABLE ONLY "public"."assessment_response_instance"
    ADD CONSTRAINT "assessment_response_instance_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."responsible_user"("id");



ALTER TABLE ONLY "public"."assessment_response_instance"
    ADD CONSTRAINT "assessment_response_instance_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."assessment_template"("id");



ALTER TABLE ONLY "public"."course"
    ADD CONSTRAINT "course_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institution"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_teacher"
    ADD CONSTRAINT "course_teacher_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_teacher"
    ADD CONSTRAINT "course_teacher_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."responsible_user"("id");



ALTER TABLE ONLY "public"."nna_activity_result"
    ADD CONSTRAINT "nna_activity_result_activity_template_id_fkey" FOREIGN KEY ("activity_template_id") REFERENCES "public"."activity_template"("id");



ALTER TABLE ONLY "public"."nna_activity_result"
    ADD CONSTRAINT "nna_activity_result_nna_user_id_fkey" FOREIGN KEY ("nna_user_id") REFERENCES "public"."nna_user"("id");



ALTER TABLE ONLY "public"."nna_activity_result"
    ADD CONSTRAINT "nna_activity_result_program_enrollment_id_fkey" FOREIGN KEY ("program_enrollment_id") REFERENCES "public"."nna_program_enrollment"("id");



ALTER TABLE ONLY "public"."assessment_item_response"
    ADD CONSTRAINT "nna_assessment_response_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."assessment_item"("id");



ALTER TABLE ONLY "public"."nna_invitation"
    ADD CONSTRAINT "nna_invitation_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."nna_invitation"
    ADD CONSTRAINT "nna_invitation_nna_user_id_fkey" FOREIGN KEY ("nna_user_id") REFERENCES "public"."nna_user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nna_program_enrollment"
    ADD CONSTRAINT "nna_program_enrollment_nna_user_id_fkey" FOREIGN KEY ("nna_user_id") REFERENCES "public"."nna_user"("id");



ALTER TABLE ONLY "public"."nna_program_enrollment"
    ADD CONSTRAINT "nna_program_enrollment_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."program_template"("id");



ALTER TABLE ONLY "public"."nna_program_enrollment"
    ADD CONSTRAINT "nna_program_enrollment_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id");



ALTER TABLE ONLY "public"."nna_subscription_enrollment"
    ADD CONSTRAINT "nna_subscription_enrollment_nna_user_fkey" FOREIGN KEY ("nna_user") REFERENCES "public"."nna_user"("id");



ALTER TABLE ONLY "public"."nna_subscription_enrollment"
    ADD CONSTRAINT "nna_subscription_enrollment_subscription_fkey" FOREIGN KEY ("subscription") REFERENCES "public"."subscription"("id");



ALTER TABLE ONLY "public"."nna_user"
    ADD CONSTRAINT "nna_user_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id");



ALTER TABLE ONLY "public"."notification"
    ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."responsible_user"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "payment_subscription_fkey" FOREIGN KEY ("subscription") REFERENCES "public"."subscription"("id");



ALTER TABLE ONLY "public"."program_activity"
    ADD CONSTRAINT "program_activity_activity_template_id_fkey" FOREIGN KEY ("activity_template_id") REFERENCES "public"."activity_template"("id");



ALTER TABLE ONLY "public"."program_activity"
    ADD CONSTRAINT "program_activity_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."program_template"("id");



ALTER TABLE ONLY "public"."responsible_nna_user"
    ADD CONSTRAINT "responsible_nna_user_nna_user_fkey" FOREIGN KEY ("nna_user") REFERENCES "public"."nna_user"("id");



ALTER TABLE ONLY "public"."responsible_nna_user"
    ADD CONSTRAINT "responsible_nna_user_responsible_user_fkey" FOREIGN KEY ("responsible_user") REFERENCES "public"."responsible_user"("id");



ALTER TABLE ONLY "public"."responsible_user"
    ADD CONSTRAINT "responsible_user_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."responsible_user"
    ADD CONSTRAINT "responsible_user_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institution"("id");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "subscription_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institution"("id");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "suscription_responsible_user_fkey" FOREIGN KEY ("responsible_user") REFERENCES "public"."responsible_user"("id");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "suscription_suscription_plan_fkey" FOREIGN KEY ("suscription_plan_id") REFERENCES "public"."subscription_plan"("id");



ALTER TABLE ONLY "public"."template_section_item"
    ADD CONSTRAINT "template_section_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."assessment_item"("id");



ALTER TABLE ONLY "public"."template_section_item"
    ADD CONSTRAINT "template_section_item_template_section_id_fkey" FOREIGN KEY ("template_section_id") REFERENCES "public"."template_section"("id");



ALTER TABLE ONLY "public"."template_section"
    ADD CONSTRAINT "template_section_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."assessment_section"("id");



ALTER TABLE ONLY "public"."template_section"
    ADD CONSTRAINT "template_section_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."assessment_template"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "public"."role"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."responsible_user"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Teachers manage invites" ON "public"."nna_invitation" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."role" "r" ON (("ur"."rol_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'teacher'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."role" "r" ON (("ur"."rol_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'teacher'::"text")))));



ALTER TABLE "public"."nna_invitation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_app_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_app_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_app_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_assessment_step"("p_instance_id" bigint, "p_section_order" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_assessment_step"("p_instance_id" bigint, "p_section_order" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_assessment_step"("p_instance_id" bigint, "p_section_order" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_student_lists"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_student_lists"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_student_lists"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_activity"("p_nna_user_id" "uuid", "p_current_activity_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_activity"("p_nna_user_id" "uuid", "p_current_activity_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_activity"("p_nna_user_id" "uuid", "p_current_activity_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_section_activity"("p_nna_user_id" "uuid", "p_current_activity_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_section_activity"("p_nna_user_id" "uuid", "p_current_activity_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_section_activity"("p_nna_user_id" "uuid", "p_current_activity_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_nna_activity_detail"("p_nna_user_id" "uuid", "p_activity_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_nna_activity_detail"("p_nna_user_id" "uuid", "p_activity_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_nna_activity_detail"("p_nna_user_id" "uuid", "p_activity_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_nna_dashboard_overview"("p_nna_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_nna_dashboard_overview"("p_nna_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_nna_dashboard_overview"("p_nna_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_nna_section_activities"("p_nna_user_id" "uuid", "p_section_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_nna_section_activities"("p_nna_user_id" "uuid", "p_section_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_nna_section_activities"("p_nna_user_id" "uuid", "p_section_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_registration"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_registration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_registration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."init_student_diagnosis"("p_first_name" "text", "p_last_name" "text", "p_birthdate" "date", "p_sex" "public"."sex") TO "anon";
GRANT ALL ON FUNCTION "public"."init_student_diagnosis"("p_first_name" "text", "p_last_name" "text", "p_birthdate" "date", "p_sex" "public"."sex") TO "authenticated";
GRANT ALL ON FUNCTION "public"."init_student_diagnosis"("p_first_name" "text", "p_last_name" "text", "p_birthdate" "date", "p_sex" "public"."sex") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_activity_result"("p_nna_user_id" "uuid", "p_activity_id" bigint, "p_result" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."save_activity_result"("p_nna_user_id" "uuid", "p_activity_id" bigint, "p_result" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_activity_result"("p_nna_user_id" "uuid", "p_activity_id" bigint, "p_result" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_activity_result"("p_nna_user_id" "uuid", "p_activity_id" bigint, "p_result" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_activity_result"("p_nna_user_id" "uuid", "p_activity_id" bigint, "p_result" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_activity_result"("p_nna_user_id" "uuid", "p_activity_id" bigint, "p_result" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_section_response"("p_instance_id" bigint, "p_section_order" integer, "p_responses" json) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_section_response"("p_instance_id" bigint, "p_section_order" integer, "p_responses" json) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_section_response"("p_instance_id" bigint, "p_section_order" integer, "p_responses" json) TO "service_role";


















GRANT ALL ON TABLE "public"."activity_age_objetive" TO "anon";
GRANT ALL ON TABLE "public"."activity_age_objetive" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_age_objetive" TO "service_role";



GRANT ALL ON SEQUENCE "public"."activity_age_objetive_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."activity_age_objetive_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."activity_age_objetive_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."activity_template" TO "anon";
GRANT ALL ON TABLE "public"."activity_template" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_template" TO "service_role";



GRANT ALL ON SEQUENCE "public"."activity_template_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."activity_template_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."activity_template_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_item" TO "anon";
GRANT ALL ON TABLE "public"."assessment_item" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_item" TO "service_role";



GRANT ALL ON SEQUENCE "public"."assessment_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."assessment_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."assessment_item_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_item_response" TO "anon";
GRANT ALL ON TABLE "public"."assessment_item_response" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_item_response" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_response_instance" TO "anon";
GRANT ALL ON TABLE "public"."assessment_response_instance" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_response_instance" TO "service_role";



GRANT ALL ON SEQUENCE "public"."assessment_response_instance_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."assessment_response_instance_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."assessment_response_instance_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_section" TO "anon";
GRANT ALL ON TABLE "public"."assessment_section" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_section" TO "service_role";



GRANT ALL ON SEQUENCE "public"."assessment_section_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."assessment_section_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."assessment_section_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_template" TO "anon";
GRANT ALL ON TABLE "public"."assessment_template" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_template" TO "service_role";



GRANT ALL ON SEQUENCE "public"."assessment_template_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."assessment_template_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."assessment_template_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."course" TO "anon";
GRANT ALL ON TABLE "public"."course" TO "authenticated";
GRANT ALL ON TABLE "public"."course" TO "service_role";



GRANT ALL ON SEQUENCE "public"."course_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."course_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."course_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."course_teacher" TO "anon";
GRANT ALL ON TABLE "public"."course_teacher" TO "authenticated";
GRANT ALL ON TABLE "public"."course_teacher" TO "service_role";



GRANT ALL ON SEQUENCE "public"."course_teacher_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."course_teacher_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."course_teacher_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."institution" TO "anon";
GRANT ALL ON TABLE "public"."institution" TO "authenticated";
GRANT ALL ON TABLE "public"."institution" TO "service_role";



GRANT ALL ON SEQUENCE "public"."institution_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."institution_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."institution_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."nna_activity_result" TO "anon";
GRANT ALL ON TABLE "public"."nna_activity_result" TO "authenticated";
GRANT ALL ON TABLE "public"."nna_activity_result" TO "service_role";



GRANT ALL ON SEQUENCE "public"."nna_activity_result_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."nna_activity_result_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."nna_activity_result_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."nna_assessment_response_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."nna_assessment_response_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."nna_assessment_response_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."nna_invitation" TO "anon";
GRANT ALL ON TABLE "public"."nna_invitation" TO "authenticated";
GRANT ALL ON TABLE "public"."nna_invitation" TO "service_role";



GRANT ALL ON SEQUENCE "public"."nna_invitation_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."nna_invitation_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."nna_invitation_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."nna_program_enrollment" TO "anon";
GRANT ALL ON TABLE "public"."nna_program_enrollment" TO "authenticated";
GRANT ALL ON TABLE "public"."nna_program_enrollment" TO "service_role";



GRANT ALL ON SEQUENCE "public"."nna_program_enrollment_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."nna_program_enrollment_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."nna_program_enrollment_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."nna_subscription_enrollment" TO "anon";
GRANT ALL ON TABLE "public"."nna_subscription_enrollment" TO "authenticated";
GRANT ALL ON TABLE "public"."nna_subscription_enrollment" TO "service_role";



GRANT ALL ON SEQUENCE "public"."nna_subscription_enrollment_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."nna_subscription_enrollment_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."nna_subscription_enrollment_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."nna_user" TO "anon";
GRANT ALL ON TABLE "public"."nna_user" TO "authenticated";
GRANT ALL ON TABLE "public"."nna_user" TO "service_role";



GRANT ALL ON TABLE "public"."notification" TO "anon";
GRANT ALL ON TABLE "public"."notification" TO "authenticated";
GRANT ALL ON TABLE "public"."notification" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notification_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payment" TO "anon";
GRANT ALL ON TABLE "public"."payment" TO "authenticated";
GRANT ALL ON TABLE "public"."payment" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payment_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payment_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payment_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."program_activity" TO "anon";
GRANT ALL ON TABLE "public"."program_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."program_activity" TO "service_role";



GRANT ALL ON SEQUENCE "public"."program_activity_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."program_activity_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."program_activity_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."program_template" TO "anon";
GRANT ALL ON TABLE "public"."program_template" TO "authenticated";
GRANT ALL ON TABLE "public"."program_template" TO "service_role";



GRANT ALL ON SEQUENCE "public"."program_activity_template_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."program_activity_template_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."program_activity_template_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."responsible_nna_user" TO "anon";
GRANT ALL ON TABLE "public"."responsible_nna_user" TO "authenticated";
GRANT ALL ON TABLE "public"."responsible_nna_user" TO "service_role";



GRANT ALL ON SEQUENCE "public"."responsible_nna_user_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."responsible_nna_user_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."responsible_nna_user_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."responsible_user" TO "anon";
GRANT ALL ON TABLE "public"."responsible_user" TO "authenticated";
GRANT ALL ON TABLE "public"."responsible_user" TO "service_role";



GRANT ALL ON TABLE "public"."role" TO "anon";
GRANT ALL ON TABLE "public"."role" TO "authenticated";
GRANT ALL ON TABLE "public"."role" TO "service_role";



GRANT ALL ON SEQUENCE "public"."role_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."role_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."role_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."subscription" TO "anon";
GRANT ALL ON TABLE "public"."subscription" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plan" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plan" TO "service_role";



GRANT ALL ON SEQUENCE "public"."suscription_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."suscription_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."suscription_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."suscription_id_seq1" TO "anon";
GRANT ALL ON SEQUENCE "public"."suscription_id_seq1" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."suscription_id_seq1" TO "service_role";



GRANT ALL ON TABLE "public"."template_section" TO "anon";
GRANT ALL ON TABLE "public"."template_section" TO "authenticated";
GRANT ALL ON TABLE "public"."template_section" TO "service_role";



GRANT ALL ON SEQUENCE "public"."template_section_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."template_section_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."template_section_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."template_section_item" TO "anon";
GRANT ALL ON TABLE "public"."template_section_item" TO "authenticated";
GRANT ALL ON TABLE "public"."template_section_item" TO "service_role";



GRANT ALL ON SEQUENCE "public"."template_section_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."template_section_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."template_section_item_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_roles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_roles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_roles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."view_my_students" TO "anon";
GRANT ALL ON TABLE "public"."view_my_students" TO "authenticated";
GRANT ALL ON TABLE "public"."view_my_students" TO "service_role";



GRANT ALL ON TABLE "public"."view_nna_active_sections" TO "anon";
GRANT ALL ON TABLE "public"."view_nna_active_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."view_nna_active_sections" TO "service_role";



GRANT ALL ON TABLE "public"."view_nna_activity_detail" TO "anon";
GRANT ALL ON TABLE "public"."view_nna_activity_detail" TO "authenticated";
GRANT ALL ON TABLE "public"."view_nna_activity_detail" TO "service_role";



GRANT ALL ON TABLE "public"."view_nna_dynamic_progress" TO "anon";
GRANT ALL ON TABLE "public"."view_nna_dynamic_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."view_nna_dynamic_progress" TO "service_role";



GRANT ALL ON TABLE "public"."view_nna_section_activities" TO "anon";
GRANT ALL ON TABLE "public"."view_nna_section_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."view_nna_section_activities" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































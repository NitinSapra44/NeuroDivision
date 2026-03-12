"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Building2, Download, Upload, Plus, CheckCircle, X, User, Calendar, ChevronDown, Mail } from "lucide-react"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase/client"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import SideMenu from "@/components/ui/SideMenu"

interface AssessmentInfo {
  instance_id: number
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
  current_section: number
}

interface Student {
  id: string
  full_name: string
  assessment_info: AssessmentInfo | null
}

interface CourseDashboardData {
  course_id: number
  course_name: string
  student_limit: number
  total_students: number
  is_plan_active: boolean
  students: Student[]
}

interface XlsxStudent {
  first_name: string
  last_name: string
  sex: string
  birthdate: string
  parent_email: string
}

export default function CourseDashboardPage() {
  return (
    <ProtectedRoute>
      <CourseDashboardContent />
    </ProtectedRoute>
  )
}

function CourseDashboardContent() {
  const params = useParams()
  const router = useRouter()
  const courseId = Number(params.courseId)

  const [data, setData] = useState<CourseDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Unlink modal
  const [unlinkStudent, setUnlinkStudent] = useState<Student | null>(null)
  const [unlinking, setUnlinking] = useState(false)

  // Add student modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", birthdate: "", sex: "", parentEmail: "" })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // XLSX upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [xlsxStudents, setXlsxStudents] = useState<XlsxStudent[] | null>(null)
  const [xlsxFileName, setXlsxFileName] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_course_dashboard", {
        p_course_id: courseId,
      })
      if (rpcError) throw rpcError
      setData(rpcData)
    } catch (err: any) {
      console.error(err)
      setError("No se pudo cargar el curso.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [courseId])

  // ===== UNLINK STUDENT =====
  const handleUnlink = async () => {
    if (!unlinkStudent || !data) return
    setUnlinking(true)
    try {
      const { error: rpcError } = await supabase.rpc("remove_student_from_course", {
        p_student_id: unlinkStudent.id,
        p_course_id: courseId,
      })
      if (rpcError) throw rpcError
      setUnlinkStudent(null)
      await fetchData()
    } catch (err: any) {
      console.error(err)
    } finally {
      setUnlinking(false)
    }
  }

  // ===== ADD STUDENT MANUALLY =====
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.firstName.trim() || !addForm.lastName.trim() || !addForm.birthdate || !addForm.sex) {
      setAddError("Por favor complete todos los campos obligatorios")
      return
    }
    if (addForm.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.parentEmail)) {
      setAddError("El correo del apoderado no tiene un formato válido")
      return
    }
    setAddLoading(true)
    setAddError(null)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("add_student_to_course", {
        p_course_id: courseId,
        p_first_name: addForm.firstName.trim(),
        p_last_name: addForm.lastName.trim(),
        p_birthdate: addForm.birthdate,
        p_sex: addForm.sex,
        p_parent_email: addForm.parentEmail?.trim()?.toLowerCase() || null,
      })
      if (rpcError) throw rpcError
      if (!rpcData.success) {
        setAddError(rpcData.error ?? "Error al agregar el alumno")
        return
      }
      setShowAddModal(false)
      setAddForm({ firstName: "", lastName: "", birthdate: "", sex: "", parentEmail: "" })
      await fetchData()
    } catch (err: any) {
      console.error(err)
      setAddError(err.message || "Error al agregar el alumno")
    } finally {
      setAddLoading(false)
    }
  }

  // ===== XLSX PARSING =====
  const handleXlsxFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setXlsxFileName(file.name)
    setUploadResult(null)
    setUploadError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const arrayBuffer = ev.target?.result
      if (!arrayBuffer) return
      const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      // Skip first 4 rows (headers/instructions), data starts at index 4
      const dataRows = rows.slice(4).filter((row) =>
        row.some((cell) => cell !== null && cell !== undefined && cell !== "")
      )

      const students: XlsxStudent[] = dataRows.map((row) => {
        const rawDate = row[3]
        let birthdate = ""
        if (rawDate instanceof Date) {
          birthdate = rawDate.toISOString().split("T")[0]
        } else if (typeof rawDate === "number") {
          // Excel serial date
          const jsDate = XLSX.SSF.parse_date_code(rawDate)
          birthdate = `${jsDate.y}-${String(jsDate.m).padStart(2, "0")}-${String(jsDate.d).padStart(2, "0")}`
        } else if (typeof rawDate === "string") {
          birthdate = rawDate
        }

        const rawSex = String(row[2] ?? "").trim().toUpperCase()
        const sex = rawSex === "M" || rawSex === "MASCULINO" ? "MASCULINO"
                  : rawSex === "F" || rawSex === "FEMENINO" ? "FEMENINO"
                  : rawSex

        return {
          first_name: String(row[0] ?? "").trim(),
          last_name: String(row[1] ?? "").trim(),
          sex,
          birthdate,
          parent_email: String(row[4] ?? "").trim(),
        }
      }).filter((s) => s.first_name || s.last_name)

      setXlsxStudents(students)
    }
    reader.readAsArrayBuffer(file)

    // Reset file input so same file can be re-selected
    e.target.value = ""
  }

  // ===== EXPORT STUDENTS TO XLSX =====
  const handleExportXlsx = () => {
    if (!data) return
    const rows = [
      ["Nombre completo", "Estado evaluación"],
      ...data.students.map((s) => [
        s.full_name,
        s.assessment_info?.status === "COMPLETED" ? "Completado"
          : s.assessment_info ? "Pendiente"
          : "Sin evaluación",
      ]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws["!cols"] = [{ wch: 30 }, { wch: 20 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Alumnos")
    XLSX.writeFile(wb, `${data.course_name}.xlsx`)
  }

  // ===== BULK IMPORT =====
  const handleBulkImport = async () => {
    if (!xlsxStudents || !data) return
    setUploadLoading(true)
    setUploadResult(null)
    setUploadError(null)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("bulk_import_students", {
        p_course_id: courseId,
        p_students: xlsxStudents,
      })
      if (rpcError) throw rpcError
      if (!rpcData.success) {
        setUploadError(rpcData.error ?? "Error al importar alumnos")
        return
      }
      const { students_added, parents_directly_linked, invitations_created } = rpcData.details
      setUploadResult(
        `Importación completada: ${students_added} alumno(s) agregado(s), ${parents_directly_linked} apoderado(s) vinculado(s), ${invitations_created} invitación(es) enviada(s).`
      )
      setXlsxStudents(null)
      setXlsxFileName(null)
      await fetchData()
    } catch (err: any) {
      console.error(err)
      setUploadError(err.message || "Error al importar alumnos")
    } finally {
      setUploadLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white font-montserrat">
        <div className="text-center px-6">
          <p className="text-xl font-bold mb-6">{error ?? "Sin datos"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-[#ED3237] text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-red-700 transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="relative w-full min-h-screen flex flex-col bg-black text-white font-montserrat">

      {/* ================= BACKGROUND ================= */}
      <div className="absolute inset-0">
        <Image
          src="/hero.png"
          alt="Hero Background"
          fill
          priority
          quality={100}
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-red-600/50 backdrop-brightness-95" />
      </div>

      {/* ================= CONTENT ================= */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-screen-2xl mx-auto px-4 md:px-8 xl:px-10 pr-4 md:pr-24 xl:pr-28 pt-8 md:pt-12 pb-20 md:pb-16">

        {/* ====== TOP BAR ====== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-white/80 hover:text-white text-sm md:text-base font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a mis cursos
          </button>
          <div className="flex items-center gap-2 bg-black/40 rounded-xl px-4 py-2 border border-white/20">
            <span className="text-white/70 text-sm font-medium">{data.total_students}/{data.student_limit}</span>
            <Building2 className="w-4 h-4 text-white/70" />
            <span className="text-white font-bold text-sm md:text-base">Curso: {data.course_name}</span>
          </div>
        </div>

        {/* ====== ACTION BUTTONS ====== */}
        <div className="flex flex-wrap items-center gap-3 mb-6">

          {/* Export student list */}
          <button
            onClick={handleExportXlsx}
            className="flex items-center gap-2 bg-black/50 border border-white/30 rounded-xl px-4 py-2.5 text-white text-xs md:text-sm font-semibold hover:bg-black/70 transition"
          >
            <Download className="w-4 h-4" />
            Planilla .xlsx
          </button>

          {/* Upload xlsx */}
          <button
            onClick={() => {
              if (!data.is_plan_active) return
              fileInputRef.current?.click()
            }}
            disabled={!data.is_plan_active}
            className="flex items-center gap-2 bg-[#ED3237] rounded-xl px-4 py-2.5 text-white text-xs md:text-sm font-bold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            Subir lista .xlsx
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleXlsxFile}
          />

          {/* Add student manually */}
          <button
            onClick={() => {
              if (!data.is_plan_active) return
              setAddError(null)
              setAddForm({ firstName: "", lastName: "", birthdate: "", sex: "", parentEmail: "" })
              setShowAddModal(true)
            }}
            disabled={!data.is_plan_active}
            className="flex items-center gap-2 bg-[#ED3237] rounded-xl px-4 py-2.5 text-white text-xs md:text-sm font-bold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Agregar alumno manual
          </button>
        </div>

        {/* ====== XLSX FILE LOADED BANNER ====== */}
        {xlsxFileName && (
          <div className="mb-4 bg-black/40 border border-white/20 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-white text-sm font-semibold">{xlsxFileName}</p>
              <p className="text-white/60 text-xs">{xlsxStudents?.length ?? 0} alumno(s) detectado(s)</p>
            </div>
            <button
              onClick={handleBulkImport}
              disabled={uploadLoading}
              className="bg-black text-white rounded-full border-2 border-white px-5 py-2 text-sm font-bold hover:bg-zinc-900 transition disabled:opacity-50"
            >
              {uploadLoading ? "Cargando..." : "Cargar alumnos"}
            </button>
          </div>
        )}

        {/* Upload result/error */}
        {uploadResult && (
          <div className="mb-4 bg-green-700/80 border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-semibold">
            {uploadResult}
          </div>
        )}
        {uploadError && (
          <div className="mb-4 bg-black/60 border border-red-400/50 rounded-xl px-4 py-3 text-red-300 text-sm font-semibold">
            {uploadError}
          </div>
        )}

        {/* ====== STUDENT TABLE ====== */}
        <div className="w-full overflow-x-auto rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm">
          <table className="w-full text-left text-sm md:text-base">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 md:px-6 py-4 text-white font-bold">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-white/60" />
                    Lista de alumnos
                  </div>
                </th>
                <th className="px-4 md:px-6 py-4 text-white font-bold">Pauta de entrada</th>
                <th className="px-4 md:px-6 py-4 text-white font-bold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.students.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-white/60">
                    No hay alumnos en este curso
                  </td>
                </tr>
              ) : (
                data.students.map((student) => {
                  const info = student.assessment_info
                  const isCompleted = info?.status === "COMPLETED"

                  return (
                    <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      {/* Full name */}
                      <td className="px-4 md:px-6 py-3 text-white font-medium">
                        {student.full_name}
                      </td>

                      {/* Assessment status */}
                      <td className="px-4 md:px-6 py-3">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-white font-semibold">
                            Completado <CheckCircle className="w-4 h-4 text-green-400" />
                          </span>
                        ) : info ? (
                          <a
                            href={`/assessment/${info.instance_id}/${info.current_section}`}
                            className="text-yellow-300 underline underline-offset-2 font-semibold hover:text-yellow-200 transition"
                          >
                            Pendiente
                          </a>
                        ) : (
                          <span className="text-white/40 text-sm">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 md:px-6 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <a
                            href={`/nna/${student.id}`}
                            className="text-white underline underline-offset-2 font-semibold hover:text-white/80 transition text-sm"
                          >
                            Ir a panel
                          </a>
                          <button
                            onClick={() => {
                              if (!data.is_plan_active) return
                              setUnlinkStudent(student)
                            }}
                            disabled={!data.is_plan_active}
                            className="text-red-300 underline underline-offset-2 font-semibold hover:text-red-200 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                          >
                            Desvincular
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ================= SIDE MENU ================= */}
      <SideMenu />

      {/* ================= UNLINK MODAL ================= */}
      {unlinkStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-white rounded-3xl px-6 py-8 max-w-sm w-full text-center shadow-2xl relative">
            <button
              onClick={() => setUnlinkStudent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            {/* Logo / header */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[#ED3237] rounded-full flex items-center justify-center">
                <span className="text-white font-black text-xl">N</span>
              </div>
            </div>
            <h2 className="text-black font-black text-2xl mb-2 uppercase">ELIMINAR ALUMNO</h2>
            <p className="text-black font-bold text-base mb-1">
              ¿Estás seguro de eliminar a <br />{unlinkStudent.full_name}?
            </p>
            <p className="text-gray-500 text-xs mb-8">
              Esta acción liberará un cupo en tu curso, pero se borrará permanentemente todo su historial de evaluaciones. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="flex-1 bg-[#ED3237] text-white rounded-full py-3 font-bold text-base hover:bg-red-700 transition disabled:opacity-50"
              >
                {unlinking ? "Eliminando..." : "Sí, eliminar"}
              </button>
              <button
                onClick={() => setUnlinkStudent(null)}
                className="flex-1 bg-gray-200 text-black rounded-full py-3 font-bold text-base hover:bg-gray-300 transition"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD STUDENT MODAL ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center font-montserrat">

          {/* Backdrop — hero + red overlay */}
          <Image src="/hero.png" alt="" fill quality={100} className="object-cover object-center" />
          <div className="absolute inset-0 bg-red-600/50" />
          <div className="absolute inset-0" onClick={() => setShowAddModal(false)} />

          {/* Modal card — 60% wide with #F1F1F2 bg */}
          <div className="relative z-10 w-[60%] min-w-105 max-w-3xl rounded-3xl overflow-hidden shadow-2xl" style={{ backgroundColor: "#F1F1F2F2" }}>

            {/* Content */}
            <div className="relative z-10 px-10 py-10">
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-black/50 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-black font-black text-2xl text-center mb-8 tracking-wide">
                INGRESAR ALUMNO
              </h2>

              <form onSubmit={handleAddStudent} className="space-y-4">

                {/* Nombre */}
                <div>
                  <label className="block text-black font-bold text-center mb-1.5">Nombre</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Ingrese nombre del alumno"
                      value={addForm.firstName}
                      onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
                      disabled={addLoading}
                      className="w-full bg-white text-black rounded-full px-4 py-3 pl-11 text-base placeholder:text-gray-400 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Apellido */}
                <div>
                  <label className="block text-black font-bold text-center mb-1.5">Apellido</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Ingrese apellidos del alumno"
                      value={addForm.lastName}
                      onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
                      disabled={addLoading}
                      className="w-full bg-white text-black rounded-full px-4 py-3 pl-11 text-base placeholder:text-gray-400 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Fecha + Sexo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-black font-bold text-center mb-1.5">Fecha de nacimiento</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="date"
                        value={addForm.birthdate}
                        onChange={(e) => setAddForm((f) => ({ ...f, birthdate: e.target.value }))}
                        max={new Date().toISOString().split("T")[0]}
                        disabled={addLoading}
                        className="w-full bg-white text-black rounded-full px-4 py-3 pl-11 text-sm focus:outline-none disabled:opacity-60 appearance-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-black font-bold text-center mb-1.5">Sexo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <select
                        value={addForm.sex}
                        onChange={(e) => setAddForm((f) => ({ ...f, sex: e.target.value }))}
                        disabled={addLoading}
                        className="w-full bg-white text-black rounded-full px-4 py-3 pl-11 pr-8 text-sm focus:outline-none disabled:opacity-60 appearance-none"
                      >
                        <option value="">Seleccione sexo</option>
                        <option value="MASCULINO">Masculino</option>
                        <option value="FEMENINO">Femenino</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Correo apoderado */}
                <div>
                  <label className="block text-black font-bold text-center mb-1.5">
                    Correo apoderado <span className="font-normal text-black/60">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      placeholder="Ingrese correo del apoderado"
                      value={addForm.parentEmail}
                      onChange={(e) => setAddForm((f) => ({ ...f, parentEmail: e.target.value }))}
                      disabled={addLoading}
                      className="w-full bg-white text-black rounded-full px-4 py-3 pl-11 text-base placeholder:text-gray-400 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Error */}
                {addError && (
                  <div className="bg-red-100 border border-red-300 rounded-xl px-4 py-3 text-red-700 font-semibold text-sm text-center">
                    {addError}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={addLoading}
                  className="w-full bg-black text-white rounded-full py-3 text-lg font-bold hover:bg-zinc-900 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {addLoading ? "Registrando..." : "Confirmar"}
                </button>

              </form>
            </div>
          </div>
        </div>
      )}

    </section>
  )
}

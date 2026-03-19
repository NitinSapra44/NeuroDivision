import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"
import PageLoader from "@/components/ui/PageLoader"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    // Keep a ref so effects always have the latest router without re-running on navigation
    const routerRef = useRef(router)
    useEffect(() => { routerRef.current = router })

    const { permissions, isLoading } = useAppContext()
    const checked = useRef(false)

    // Subscribe to auth changes ONCE on mount — never recreate on navigation
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_OUT") {
                useAppContext.getState().clearContext()
                routerRef.current.push("/login")
            }
        })
        return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Check auth ONCE on mount — reads latest Zustand state via getState()
    useEffect(() => {
        const checkAuth = async () => {
            const { permissions, setPermissions, setIsLoading } = useAppContext.getState()
            console.log("PERMISSIONS:", permissions)
            if (permissions) {
                setIsLoading(false)
                return
            }

            if (checked.current) return
            checked.current = true

            try {
                const { data: { user }, error } = await supabase.auth.getUser()
                console.log("USER:", user)

                if (error || !user) {
                    console.log("No authenticated user found, redirecting to login")
                    routerRef.current.push("/login")
                    return
                }

                console.log("User found, fetching app context...")
                console.log("Calling RPC get_app_context")
                const { data: contextData, error: contextError } = await supabase.rpc('get_app_context')
                console.log("RPC RESULT:", contextData, contextError)

                if (contextError || !contextData) {
                    console.error("Error fetching context:", contextError)
                    await supabase.auth.signOut()
                    routerRef.current.push("/login")
                    return
                }

                setPermissions(contextData.permissions)
            } catch (err) {
                console.error("Auth check failed:", err)
                routerRef.current.push("/login")
            } finally {
                useAppContext.getState().setIsLoading(false)
            }
        }

        checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Only block the UI if still loading AND no permissions yet.
    // If permissions are already in Zustand (e.g. from sessionStorage), skip
    // the full-screen loader so the Navbar is never covered during navigation.
    if (isLoading && !permissions) {
        return <PageLoader dark />
    }

    // Double check permissions exist to be safe
    if (!permissions) return null

    return <>{children}</>
}

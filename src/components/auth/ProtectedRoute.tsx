import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"
import PageLoader from "@/components/ui/PageLoader"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { permissions, setPermissions, isLoading, setIsLoading, clearContext } = useAppContext()
    // Use a ref to prevent double-firing in strict mode or rapid re-renders
    const checked = useRef(false)

    // Redirect to login when session expires
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_OUT") {
                clearContext()
                router.push("/login")
            }
        })
        return () => subscription.unsubscribe()
    }, [router, clearContext])

    useEffect(() => {
        const checkAuth = async () => {
            console.log("PERMISSIONS:", permissions)
            // If we already have permissions, we are good to go.
            // This relies on Zustand persistence rehydrating before this effect runs or very quickly.
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
                    router.push("/login")
                    return
                }

                // User authenticated but permissions are missing (e.g., page refresh)
                console.log("User found, fetching app context...")
                console.log("Calling RPC get_app_context")
                const { data: contextData, error: contextError } = await supabase.rpc('get_app_context')
                console.log("RPC RESULT:", contextData, contextError)

                if (contextError || !contextData) {
                    console.error("Error fetching context:", contextError)
                    await supabase.auth.signOut() // Safety logout if context fails
                    router.push("/login")
                    return
                }

                setPermissions(contextData.permissions)
            } catch (err) {
                console.error("Auth check failed:", err)
                router.push("/login")
            } finally {
                setIsLoading(false)
            }
        }

        checkAuth()
    }, [router, setPermissions, setIsLoading])

    if (isLoading) {
        return <PageLoader dark />
    }

    // Double check permissions exist to be safe
    if (!permissions) return null

    return <>{children}</>
}

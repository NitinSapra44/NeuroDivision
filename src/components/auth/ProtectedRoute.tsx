import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"
import { Loader2 } from "lucide-react"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { permissions, setPermissions, isLoading, setIsLoading } = useAppContext()
    // Use a ref to prevent double-firing in strict mode or rapid re-renders
    const checked = useRef(false)

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
    }, [router, permissions, setPermissions, setIsLoading]) // Removed supabase from dependency as it's singleton

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-black text-white">
                <Loader2 className="w-10 h-10 animate-spin text-[#ED3237]" />
            </div>
        )
    }

    // Double check permissions exist to be safe
    if (!permissions) return null

    return <>{children}</>
}


import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAppContext } from "@/store/app-context"
import { useState } from "react"

export default function LogoutButton() {
    const router = useRouter()
    const { clearContext } = useAppContext()
    const [loading, setLoading] = useState(false)

    const handleLogout = async () => {
        setLoading(true)
        try {
            await supabase.auth.signOut()
            clearContext()
            console.log("LOGOUT COMPLETE")
            router.push("/login")
        } catch (error) {
            console.error("Error signing out:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            className="flex items-center gap-2 text-white hover:text-red-500 transition-colors"
            title="Cerrar sesión"
        >
            <LogOut className="w-6 h-6" />
            <span className="hidden md:inline font-medium">Salir</span>
        </button>
    )
}


import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AppPermissions {
    view_type: string
    [key: string]: any
}

interface AppContextState {
    permissions: AppPermissions | null
    isLoading: boolean
    setPermissions: (permissions: AppPermissions) => void
    clearContext: () => void
    setIsLoading: (loading: boolean) => void
}

export const useAppContext = create<AppContextState>()(
    persist(
        (set) => ({
            permissions: null,
            isLoading: true, // Start loading by default to check session
            setPermissions: (permissions) => set({ permissions }),
            clearContext: () => set({ permissions: null }),
            setIsLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'app-context',
            storage: createJSONStorage(() => sessionStorage), // or localStorage
            partialize: (state) => ({ permissions: state.permissions }), // only persist permissions
        }
    )
)

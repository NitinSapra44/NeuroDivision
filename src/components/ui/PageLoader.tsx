// Full-page loader: thin red bar sweeping across the center, clean background.
interface PageLoaderProps {
  dark?: boolean
}

export default function PageLoader({ dark = false }: PageLoaderProps) {
  return (
    <div className={`fixed inset-0 z-50 ${dark ? "bg-black" : "bg-white"} overflow-hidden flex items-center justify-center`}>
      <div className="w-48 h-[3px] bg-transparent overflow-hidden">
        <div className="h-full w-1/3 bg-[#ED3237] animate-page-bar" />
      </div>
    </div>
  )
}

import Image from "next/image"

const SvgInstagram = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width={52} height={52} fill="none" viewBox="0 0 60 60">
    <path fill="#FEFEFE" d="M29.587 59.178C13.271 59.178 0 45.904 0 29.588 0 13.272 13.271 0 29.587 0s29.59 13.272 29.59 29.588c0 16.316-13.274 29.59-29.59 29.59Zm10.375-42.185a2.298 2.298 0 1 0 0 4.593 2.298 2.298 0 0 0 0-4.593Zm-18.195-3.308c-4.458 0-8.083 3.624-8.083 8.082v15.644c0 4.456 3.625 8.082 8.083 8.082H37.41c4.457 0 8.084-3.626 8.084-8.082V21.767c0-4.457-3.627-8.082-8.084-8.082H21.767ZM37.41 49.18H21.767c-6.49 0-11.77-5.28-11.77-11.77V21.768c0-6.49 5.28-11.77 11.77-11.77H37.41c6.49 0 11.77 5.28 11.77 11.77v15.644c0 6.49-5.28 11.769-11.77 11.769Zm-7.66-13.41a6.188 6.188 0 0 1-6.182-6.18 6.19 6.19 0 0 1 6.182-6.183 6.189 6.189 0 0 1 6.18 6.183 6.188 6.188 0 0 1-6.18 6.18Zm0-15.831c-5.321 0-9.65 4.329-9.65 9.65 0 5.32 4.329 9.649 9.65 9.649 5.32 0 9.649-4.328 9.649-9.648 0-5.322-4.329-9.651-9.649-9.651Z" />
  </svg>
)

const SvgTwitter = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width={52} height={52} fill="none" viewBox="0 0 60 60">
    <path fill="#FEFEFE" d="M29.587 59.178C13.271 59.178 0 45.906 0 29.59 0 13.275 13.271 0 29.587 0s29.591 13.275 29.591 29.591c0 16.315-13.275 29.587-29.59 29.587Zm-.984-27.206-1.517-2.169-12.067-17.26h5.195l9.74 13.93 1.516 2.17 12.657 18.106h-5.194l-10.33-14.775v-.002Zm4.632-5.383L47.51 9.996h-3.383L31.734 24.404l-9.9-14.408H10.419l14.968 21.786L10.418 49.18H13.8l13.09-15.213L37.342 49.18h11.416L33.236 26.589Z" />
  </svg>
)

const SvgFacebook = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width={52} height={52} fill="none" viewBox="0 0 60 60">
    <path fill="#FEFEFE" fillRule="evenodd" d="M29.588 59.178C13.272 59.178 0 45.906 0 29.589 0 13.273 13.272 0 29.588 0c16.316 0 29.59 13.273 29.59 29.589 0 16.317-13.274 29.589-29.59 29.589Zm3.687-32.773h5.11l.484-5.943h-5.594v-3.787c0-1.72.478-2.893 2.944-2.893h3.144V8.475A42.16 42.16 0 0 0 34.787 8.3c-4.526 0-7.625 2.763-7.625 7.843v4.319h-5.118v5.943h5.118V44.88h6.113V26.405Z" clipRule="evenodd" />
  </svg>
)

const footerLinks = ["Políticas", "Sitios de interés", "Ubicación"]

export default function Footer() {
  return (
    <footer className="w-full bg-black text-[#F2F2F2] font-montserrat py-6 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

        {/* Logo */}
        <div className="flex justify-center md:justify-start">
          <Image
            src="/logo-alt.svg"
            alt="Logo NeuroDiversión"
            width={140}
            height={76}
            className="object-contain"
          />
        </div>

        {/* Social Media + Copyright */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            <button className="hover:opacity-70 transition" aria-label="Instagram">
              <SvgInstagram />
            </button>
            <button className="hover:opacity-70 transition" aria-label="Twitter">
              <SvgTwitter />
            </button>
            <button className="hover:opacity-70 transition" aria-label="Facebook">
              <SvgFacebook />
            </button>
          </div>
          <p className="text-sm font-bold text-center hidden md:block">
            © 2025 Todos los derechos.
          </p>
        </div>

        {/* Links + Corfo text */}
        <div className="flex flex-col items-center md:items-end gap-3 text-right">
          <ul className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-1">
            {footerLinks.map((link) => (
              <li key={link}>
                <button className="text-sm font-bold uppercase hover:text-yellow-300 transition">
                  {link}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-center md:text-right max-w-xs">
            Esta iniciativa es apoyada por el Comité Corfo Antofagasta, a través
            del Fondo Semilla Inicia Corfo código &quot;24INI-242635&quot;
          </p>
          <p className="text-sm font-bold md:hidden">© 2025 Todos los derechos.</p>
        </div>

      </div>
    </footer>
  )
}

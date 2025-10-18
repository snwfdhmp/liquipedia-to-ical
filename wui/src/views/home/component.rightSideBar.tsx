import { FaGithub, FaHeart } from "react-icons/fa6"

export const RightSidebar = () => {
  return (
    <div className="flex flex-col flex-1 items-end gap-2">
      <div className="text-2xl font-bold flex-1 text-right sponsor-blink">
        Support the development
      </div>
      <div className="text-base text-gray-500 text-right sponsor-blink">
        Is this project useful? You can sponsor it with as little as $1.
      </div>
      <div className="text-base text-gray-500 mt-2">
        <a
          href="https://github.com/sponsors/snwfdhmp"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors duration-300 sponsor-blink"
        >
          <FaHeart /> GitHub Tips
        </a>
      </div>
      <div className="text-2xl font-bold flex-1 mt-8">Links</div>
      <div className="text-base text-gray-500">
        <a
          href="https://github.com/snwfdhmp/liquipedia-to-ical"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-600"
        >
          <FaGithub />
          GitHub Repository
        </a>
      </div>
    </div>
  )
}

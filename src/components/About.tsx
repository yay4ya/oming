import iconLarge from "@/assets/icon_large.png";
import React from "react";

function About({ ...props }: React.HTMLProps<HTMLDivElement>) {
  const [show, setShow] = React.useState(false);

  return (
    <div {...props}>
      <button type="button" className="cursor-pointer" onClick={() => setShow((prev) => !prev)}>
        <img src={iconLarge} alt="Icon" className="w-12 h-12 rounded-lg border border-gray-200/50 object-cover" />
      </button>
      <div className="fixed top-0 left-0 w-screen h-screen z-50" style={{ display: show ? "block" : "none" }}>
        <div className="absolute top-0 left-0 w-full h-full" onClick={() => setShow(false)} onKeyDown={undefined} />
        <div className="w-screen h-dvh flex items-center justify-center p-4">
          <div className="w-[400px] h-fit max-w-svw m-auto bg-white/40 backdrop-blur-xl border border-white/40 shadow-xl rounded-xl p-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <img
                src={iconLarge}
                alt="Icon"
                className="w-2/3 object-cover aspect-square m-auto rounded-xl border border-white/40"
              />
              <p>
                <a
                  href="https://github.com/yay4ya/oming"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 font-bold text-lg"
                >
                  yay4ya/oming
                </a>
                <br />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;

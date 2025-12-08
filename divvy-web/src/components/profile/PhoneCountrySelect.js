"use client";

import { Fragment } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  Transition,
} from "@headlessui/react";
import { FiChevronDown } from "react-icons/fi";
import ReactCountryFlag from "react-country-flag";

export default function PhoneCountrySelect({
  countryCode,
  setCountryCode,
  countryOptions,
}) {
  // Graceful fallback if countryCode is missing/not found
  const selected = countryOptions.find((c) => c.iso2 === countryCode) ||
    countryOptions[0] || { iso2: countryCode || "AU", dialCode: "" };

  return (
    <Listbox value={countryCode} onChange={setCountryCode}>
      <div className="relative">
        {/* Trigger button */}
        <ListboxButton
          className="
            relative flex h-11 w-full items-center
            cursor-pointer rounded-lg border border-slate-300 bg-white
            pl-10 pr-8 text-left text-sm shadow-sm
            focus:border-[#84CC16] focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30
          "
        >
          {/* Flag icon */}
          <span className="absolute left-3 top-1/2 -translate-y-1/2">
            <ReactCountryFlag
              countryCode={selected.iso2}
              svg
              className="translate-y-[1px] text-xl leading-none"
            />
          </span>

          {/* Country code */}
          <span className="block truncate">
            {selected.iso2} +{selected.dialCode}
          </span>

          {/* Chevron */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <FiChevronDown />
          </span>
        </ListboxButton>

        {/* Dropdown options */}
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListboxOptions
            className="
              absolute z-50 mt-1 max-h-60 w-full overflow-auto
              rounded-lg border border-slate-200 bg-white py-1 shadow-lg
            "
          >
            {countryOptions.map((c) => (
              <ListboxOption
                key={c.iso2}
                value={c.iso2}
                className="
                  flex cursor-pointer items-center gap-3 px-3 py-2 text-sm
                  data-[headlessui-state~='active']:bg-[#ecfccb]
                "
              >
                <ReactCountryFlag
                  countryCode={c.iso2}
                  svg
                  className="translate-y-[1px] text-xl leading-none"
                />
                <span>
                  {c.iso2} +{c.dialCode}
                </span>
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  );
}

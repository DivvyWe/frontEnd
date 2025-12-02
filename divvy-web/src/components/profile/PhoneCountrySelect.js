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
  const selected = countryOptions.find((c) => c.iso2 === countryCode);

  return (
    <Listbox value={countryCode} onChange={setCountryCode}>
      <div className="relative">
        {/* Trigger Button */}
        <ListboxButton className="relative w-full cursor-pointer rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-8 text-left shadow-sm focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30">
          <span className="absolute left-3 top-1/2 -translate-y-1/2">
            <ReactCountryFlag
              countryCode={countryCode}
              svg
              className="text-xl leading-none translate-y-[1px]"
            />
          </span>

          <span className="block truncate text-sm">
            {selected.iso2} +{selected.dialCode}
          </span>

          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <FiChevronDown />
          </span>
        </ListboxButton>

        {/* Dropdown Panel */}
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
            {countryOptions.map((c) => (
              <ListboxOption
                key={c.iso2}
                value={c.iso2}
                className={({ active }) =>
                  `flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${
                    active ? "bg-[#ecfccb]" : ""
                  }`
                }
              >
                <ReactCountryFlag
                  countryCode={c.iso2}
                  svg
                  className="text-xl leading-none translate-y-[1px]"
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

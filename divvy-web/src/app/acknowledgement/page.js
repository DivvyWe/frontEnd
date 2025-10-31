"use client";

export default function AcknowledgementPage() {
  return (
    <div className="text-gray-800">
      <h1 className="text-3xl font-bold text-[#84CC16] mb-4">
        Acknowledgement of Country
      </h1>

      <section className="space-y-6 leading-relaxed">
        <p className="text-lg">
          We acknowledge the <span className="font-semibold">Larrakia</span>{" "}
          people as the Traditional Owners and Custodians of the lands and
          waters on which we operate in the Darwin region. We pay our deep
          respects to Elders past and present, and we extend that respect to all
          Aboriginal and Torres Strait Islander peoples.
        </p>

        <p>
          We recognise the enduring connection of First Nations peoples to
          Country, culture, and community, and we are committed to listening,
          learning, and contributing to a future grounded in respect and
          self-determination.
        </p>

        {/* <div className="p-4 rounded-lg bg-white/70 border">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Our Commitment
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Use respectful language and representation in our products.</li>
            <li>Engage with community perspectives where appropriate.</li>
            <li>
              Support accessibility and inclusion in our design decisions.
            </li>
          </ul>
        </div> */}

        <p className="text-sm text-gray-600">
          Note: We use “Larrakia” as the widely recognised spelling. If your
          community or organisation prefers “Larrakeyah” in specific contexts,
          we’re happy to align this page accordingly.
        </p>
      </section>

      <footer className="mt-12 border-t pt-6 text-sm text-gray-500">
        © {new Date().getFullYear()} Qbase Solution. All rights reserved.
      </footer>
    </div>
  );
}

"use client";

export default function TermsPage() {
  return (
    <div className="text-gray-800">
      <h1 className="text-3xl font-bold text-[#84CC16] mb-4">
        Divsez – Terms of Service
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Last Updated: <strong>12 October 2025</strong>
      </p>

      <section className="space-y-8 leading-relaxed">
        <p>
          <strong>App Name:</strong> Divsez <br />
          <strong>Developer:</strong> Qbase Solution <br />
          <strong>Contact:</strong>{" "}
          <a
            href="mailto:contact@divsez.com"
            className="text-[#84CC16] underline"
          >
            contact@divsez.com
          </a>
        </p>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Welcome to Divsez
          </h2>
          <p>
            Divsez is a free, community-based expense-sharing app developed and
            maintained by Qbase Solution. It helps you record shared expenses
            and track informal balances with friends, families, and teams. The
            records created are informal and not legally binding contracts. We
            provide Divsez on an “as-is” and “as-available” basis.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Who Can Use Divsez
          </h2>
          <p>
            You must be at least 13 years old (or the digital consent age in
            your jurisdiction) to use Divsez. You must agree to these Terms and
            our Privacy Policy. Qbase Solution may suspend or restrict access
            for violations or misuse.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Description of Service
          </h2>
          <p>
            Divsez allows you to create groups, add expenses, and share costs
            among selected people. The service provides summaries, balances, and
            expense tracking features for personal use only.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Informal Debts and Shared Records
          </h2>
          <p>
            Divsez provides an informal platform for sharing expenses. Qbase
            Solution does not verify accuracy or enforce payments. All records
            are informational only.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Acceptable Use
          </h2>
          <p>
            You agree to use Divsez in compliance with laws and respect for
            others. Do not post false, illegal, or offensive content, engage in
            fraud, or disrupt the platform.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Privacy and Security
          </h2>
          <p>
            Qbase Solution values your privacy. We collect only limited data
            such as your name, email, and group expenses. See our{" "}
            <a href="/privacy" className="text-[#84CC16] underline">
              Privacy Policy
            </a>{" "}
            for details.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            No Warranty
          </h2>
          <p>
            Divsez is provided “as is” and “as available.” Qbase Solution does
            not guarantee uninterrupted service or error-free operation.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Limitation of Liability
          </h2>
          <p>
            To the fullest extent allowed by law, Qbase Solution, its employees,
            and affiliates are not liable for indirect, incidental, or
            consequential damages.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Termination
          </h2>
          <p>
            Qbase Solution may suspend or terminate your access to Divsez if you
            breach these Terms or misuse the service.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Intellectual Property
          </h2>
          <p>
            All trademarks, logos, and app content belong to Qbase Solution.
            Users receive a limited license for personal use only.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Changes to Terms
          </h2>
          <p>
            Qbase Solution may update these Terms periodically. Updates will be
            posted with a new effective date.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Governing Law
          </h2>
          <p>
            These Terms are governed by the laws of Australia. Disputes shall be
            resolved in Darwin, Northern Territory.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Contact Us
          </h2>
          <p>
            For questions or feedback, contact us at{" "}
            <a
              href="mailto:contact@divsez.com"
              className="text-[#84CC16] underline"
            >
              contact@divsez.com
            </a>
            .
          </p>
        </div>
      </section>

      <footer className="mt-12 border-t pt-6 text-sm text-gray-500">
        © {new Date().getFullYear()} Qbase Solution. All rights reserved.
      </footer>
    </div>
  );
}

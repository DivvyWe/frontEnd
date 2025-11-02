"use client";

export default function TermsPage() {
  return (
    <div className="text-gray-800">
      <h1 className="text-3xl font-bold text-[#84CC16] mb-4">
        Divsez – Terms of Service (Beta)
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Last Updated: <strong>1 November 2025</strong>
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

        {/* 🧩 New Beta Disclaimer Section */}
        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Beta Release Notice
          </h2>
          <p>
            Divsez is currently offered as a{" "}
            <strong>public beta version</strong>. This means some features may
            be incomplete, experimental, or subject to change without notice.
            During this testing phase, you may encounter bugs, data
            inaccuracies, or temporary interruptions. By using Divsez Beta, you
            acknowledge that the app is still under active development and agree
            to use it at your own discretion and risk.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Welcome to Divsez
          </h2>
          <p>
            Divsez is a community-based expense-sharing app developed and
            maintained by Qbase Solution. It helps you record shared expenses
            and track balances with friends, families, and teams. The records
            created are informal and not legally binding. Divsez Beta is
            provided on an “as-is” and “as-available” basis, and your feedback
            helps us improve the final release.
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
            for violations, misuse, or technical issues during beta testing.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Description of Service
          </h2>
          <p>
            Divsez allows you to create groups, add expenses, and share costs
            among selected people. As this is a beta version, some features may
            be limited or behave differently from the final release. Data may be
            periodically reset or modified during testing.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Informal Debts and Shared Records
          </h2>
          <p>
            Divsez provides an informal platform for sharing expenses. Qbase
            Solution does not verify accuracy or enforce payments. All records
            are informational only and should not be used as legal or financial
            evidence of debt.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Acceptable Use
          </h2>
          <p>
            You agree to use Divsez in compliance with applicable laws and
            respect for others. Do not post false, illegal, or offensive
            content, engage in fraud, or disrupt the platform or testing
            environment.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Privacy and Data During Beta
          </h2>
          <p>
            Qbase Solution values your privacy. During the beta phase, we may
            collect anonymous or diagnostic data to help improve performance and
            stability. We collect only limited information such as your name,
            contact details, and group activity. For full details, see our{" "}
            <a href="/privacy" className="text-[#84CC16] underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            No Warranty (Beta Software)
          </h2>
          <p>
            Divsez Beta is provided “as is,” without any warranties of any kind.
            Qbase Solution does not guarantee uninterrupted service,
            compatibility, or accuracy of information. Features may be added,
            removed, or changed at any time without prior notice.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, Qbase Solution, its
            developers, and affiliates are not liable for any loss, data
            corruption, or damages resulting from your use of Divsez Beta. You
            assume full responsibility for any risks associated with using a
            beta product.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Termination
          </h2>
          <p>
            Qbase Solution may suspend, modify, or terminate beta access at any
            time without notice. Your data may be deleted or reset as part of
            testing or maintenance.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Intellectual Property
          </h2>
          <p>
            All trademarks, logos, and app content belong to Qbase Solution.
            Users receive a limited license for personal and non-commercial use
            during the beta period.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Changes to Terms
          </h2>
          <p>
            Qbase Solution may update these Terms or make changes to the beta
            program at any time. Updated versions will include a revised
            effective date at the top of this page.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Governing Law
          </h2>
          <p>
            These Terms are governed by the laws of Australia. Any disputes
            arising from Divsez or these Terms will be handled in the courts of
            Darwin, Northern Territory.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Contact Us
          </h2>
          <p>
            For questions, feedback, or bug reports during beta testing, contact
            us at{" "}
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
        © {new Date().getFullYear()} Qbase Solution. All rights reserved. <br />
        <span className="text-[11px] text-gray-400">
          Divsez is currently in beta. Features, data, and performance may
          change without prior notice.
        </span>
      </footer>
    </div>
  );
}

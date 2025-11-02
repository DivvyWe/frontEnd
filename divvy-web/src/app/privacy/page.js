"use client";

export default function PrivacyPage() {
  return (
    <div className="text-gray-800">
      <h1 className="text-3xl font-bold text-[#84CC16] mb-4">
        Divsez – Privacy Policy (Beta)
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

        {/* 🧩 New Beta Notice */}
        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Beta Notice
          </h2>
          <p>
            Divsez is currently in its <strong>public beta phase</strong>. This
            means the app is still being refined and tested. During this period,
            Qbase Solution may collect limited diagnostic or performance data to
            improve functionality, stability, and user experience. Some privacy
            features may evolve or change before the full release.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Scope</h2>
          <p>
            This Privacy Policy explains how Qbase Solution collects, uses,
            stores, and protects your information while you use the beta version
            of Divsez. By using Divsez Beta, you consent to this Policy and to
            the collection of limited diagnostic data necessary for testing.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Information We Collect
          </h2>
          <p>
            We collect only what is necessary to operate the service and improve
            the beta experience:
          </p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Your name, email, and basic profile information.</li>
            <li>Expense records, group names, and contributions you enter.</li>
            <li>
              Diagnostic data such as app version, performance metrics, and
              crash reports.
            </li>
            <li>
              Optional contact information if you provide feedback or bug
              reports.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Use of Information
          </h2>
          <p>
            We use your data to operate, secure, and enhance Divsez Beta. This
            includes maintaining your groups and expenses, fixing issues, and
            improving user experience. Qbase Solution does{" "}
            <strong>not sell, rent, or share</strong> personal data with
            marketers or third parties for advertising purposes.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Data Sharing
          </h2>
          <p>
            We share your expense or group data only with members you’ve
            explicitly added. We may also use trusted third-party services (such
            as hosting, analytics, or image storage) that are bound by
            confidentiality and security agreements. Data may be disclosed only
            if required by law.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Data Retention
          </h2>
          <p>
            Your data is retained as long as necessary to provide the beta
            service. Because this is a testing version, data may occasionally be
            cleared or reset as part of app maintenance. You may request
            deletion of your account or data at any time by emailing{" "}
            <a
              href="mailto:contact@divsez.com"
              className="text-[#84CC16] underline"
            >
              contact@divsez.com
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Security</h2>
          <p>
            We use encryption, secure hosting, and restricted data access to
            protect your information. While we take reasonable precautions, the
            beta nature of the service may expose you to occasional bugs or
            downtime. We encourage you not to share sensitive financial details
            within the app during testing.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Children's Privacy
          </h2>
          <p>
            Divsez is not intended for individuals under 13 years old. Qbase
            Solution does not knowingly collect data from minors. If we learn
            that a child’s information has been submitted, we will promptly
            delete it.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            International Data Transfers
          </h2>
          <p>
            Data may be processed or stored on servers located in other
            countries. We ensure that all transfers comply with applicable data
            protection laws and use appropriate safeguards.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Your Rights
          </h2>
          <p>
            You have the right to access, update, or delete your data. For
            privacy-related requests, please email us at{" "}
            <a
              href="mailto:contact@divsez.com"
              className="text-[#84CC16] underline"
            >
              contact@divsez.com
            </a>
            . During beta, response times may vary due to limited support staff.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Changes to Policy
          </h2>
          <p>
            This Privacy Policy may be updated as Divsez progresses from beta to
            full release. We will update the “Last Updated” date at the top of
            this page when changes are made. Continued use of Divsez Beta
            indicates acceptance of the latest version.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Contact</h2>
          <p>
            For privacy concerns, feedback, or bug reports, contact the Qbase
            Solution Privacy Team at{" "}
            <a
              href="mailto:contact@divsez.com"
              className="text-[#84CC16] underline"
            >
              contact@divsez.com
            </a>
            , Darwin, Northern Territory, Australia.
          </p>
        </div>
      </section>

      <footer className="mt-12 border-t pt-6 text-sm text-gray-500">
        © {new Date().getFullYear()} Qbase Solution. All rights reserved. <br />
        <span className="text-[11px] text-gray-400">
          Divsez Beta collects limited diagnostic data to improve performance.
          Your feedback and participation help shape the final version.
        </span>
      </footer>
    </div>
  );
}

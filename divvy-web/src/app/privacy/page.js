"use client";

export default function PrivacyPage() {
  return (
    <div className="text-gray-800">
      <h1 className="text-3xl font-bold text-[#84CC16] mb-4">
        Divsez – Privacy Policy
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
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Scope</h2>
          <p>
            This Privacy Policy explains how Qbase Solution collects, uses,
            stores, and protects your information. By using Divsez, you consent
            to this Policy.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Information We Collect
          </h2>
          <p>
            We collect only what is necessary: your name, email, expense
            entries, and limited device information.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Use of Information
          </h2>
          <p>
            We use your data to operate, secure, and improve Divsez. Qbase
            Solution does not sell or share personal data with marketers.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Data Sharing
          </h2>
          <p>
            We share data only with your group members or as required by law. We
            may use third-party providers bound by confidentiality and security
            agreements.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Data Retention
          </h2>
          <p>
            We retain your data only as long as needed to operate the app. You
            may delete your account at any time.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Security</h2>
          <p>
            Qbase Solution uses encryption, secure servers, and limited access
            protocols to protect your data. While no system is completely
            secure, we strive to maintain a strong security framework.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Children's Privacy
          </h2>
          <p>
            Divsez is not intended for users under 13 years of age. Qbase
            Solution does not knowingly collect data from minors.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            International Data Transfers
          </h2>
          <p>
            Your data may be processed in other countries under appropriate
            legal safeguards.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Your Rights
          </h2>
          <p>
            You can access, modify, or delete your information by contacting us
            at{" "}
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
          <h2 className="text-xl font-semibold mb-2 text-gray-900">
            Changes to Policy
          </h2>
          <p>
            Qbase Solution may revise this Policy periodically. Continued use of
            Divsez means you accept the updated version.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Contact</h2>
          <p>
            Qbase Solution Privacy Team –{" "}
            <a
              href="mailto:contact@divsez.com"
              className="text-[#84CC16] underline"
            >
              contact@divsez.com
            </a>
            , Darwin, NT, Australia.
          </p>
        </div>
      </section>

      <footer className="mt-12 border-t pt-6 text-sm text-gray-500">
        © {new Date().getFullYear()} Qbase Solution. All rights reserved.
      </footer>
    </div>
  );
}

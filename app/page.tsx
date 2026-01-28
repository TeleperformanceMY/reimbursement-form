"use client"
import { ReimbursementForm } from "@/components/reimbursement-form"
import { LanguageProvider } from "@/components/language-provider"

export default function Page() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-neutral-50">
        <ReimbursementForm />
      </div>
    </LanguageProvider>
  )
}

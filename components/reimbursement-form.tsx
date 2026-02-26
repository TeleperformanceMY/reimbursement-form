"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Loader2, Globe } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ExpenseRow {
  id: string
  date: string
  particulars: string
  refNo: string
  currency: string
  amountSource: string
  fxRate: string
  amountBilling: string
  billableToClient: boolean
  expenseType: string
}

const COMPANY_OPTIONS = ["TPMY", "TPTH", "Majorel TH"] as const

const DEPARTMENT_OPTIONS = [

  "Production and Delivery of Service",
  "Agents",
  "HR operation - agents",
  "Subject Matter Experts",
  "Supervisors",
  "Dedicated employees other than QA",
  "Selection and Recruitment",
  "Real Time Analyst",
  "Mission Control",
  "WFM",
  "Trainers",
  "Quality Assurance",
  "TAP (DC)",
  "Finance",
  "Payroll",
  "IT",
  "Recruiting",
  "Legal, Compliance and Privacy",
  "Administration",
  "Facilities",
  "Human Resources",
  "Learning and Development",
  "Global Mobility Team",
  "Transformation office",  
  "CEO",
  "COO",
  "Finance Director",
  "TRA director"
] as const

const CURRENCY_OPTIONS = ["MYR", "USD", "EUR", "GBP", "JPY", "CNY", "SGD", "KRW", "IDR", "INR", "THB"] as const

interface AttachmentFile {
  id: string
  file: File | null
  error: string
}

export function ReimbursementForm() {
  const { language, setLanguage, t } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBillableToClient, setIsBillableToClient] = useState(false)
  const [clientName, setClientName] = useState("")

  // Form fields
  const [company, setCompany] = useState("")
  const [employeeName, setEmployeeName] = useState("")
  const [employeeIdent, setEmployeeIdent] = useState("")
  const [department, setDepartment] = useState("")
  const [date, setDate] = useState("")
  const [purposeOfTravel, setPurposeOfTravel] = useState("")
  const [travelStartDate, setTravelStartDate] = useState("")
  const [travelEndDate, setTravelEndDate] = useState("")
  const [noOfDays, setNoOfDays] = useState("")
  const [travelDestination, setTravelDestination] = useState("")
  const [submittedBy, setSubmittedBy] = useState("")

  // Expense rows
  const [expenses, setExpenses] = useState<ExpenseRow[]>([
    {
      id: "1",
      date: "",
      particulars: "",
      refNo: "",
      currency: "MYR",
      amountSource: "",
      fxRate: "1",
      amountBilling: "",
      billableToClient: false,
      expenseType: "meals",
    },
  ])

  // Attachments
  const [attachments, setAttachments] = useState<AttachmentFile[]>([{ id: "1", file: null, error: "" }])

  // Auto-calculate No. of Days from travel start/end dates
  useEffect(() => {
    if (travelStartDate && travelEndDate) {
      const start = new Date(travelStartDate)
      const end = new Date(travelEndDate)
      if (end >= start) {
        const diffTime = end.getTime() - start.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        setNoOfDays(String(Math.max(0, diffDays)))
      } else {
        setNoOfDays("")
      }
    } else {
      setNoOfDays("")
    }
  }, [travelStartDate, travelEndDate])

  const addExpenseRow = () => {
    setExpenses([
      ...expenses,
      {
        id: Date.now().toString(),
        date: "",
        particulars: "",
        refNo: "",
        currency: "MYR",
        amountSource: "",
        fxRate: "1",
        amountBilling: "",
        billableToClient: false,
        expenseType: "meals",
      },
    ])
  }

  const removeExpenseRow = (id: string) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter((exp) => exp.id !== id))
    }
  }

  const updateExpense = (id: string, field: keyof ExpenseRow, value: string | boolean) => {
    setExpenses(
      expenses.map((exp) => {
        if (exp.id === id) {
          const updated = { ...exp, [field]: value }

          // Auto-calculate billing amount when source amount or FX rate changes
          if (field === "amountSource" || field === "fxRate") {
            const source = Number.parseFloat(field === "amountSource" ? String(value) : exp.amountSource) || 0
            const fx = Number.parseFloat(field === "fxRate" ? String(value) : exp.fxRate) || 1
            updated.amountBilling = (source * fx).toFixed(2)
          }

          return updated
        }
        return exp
      }),
    )
  }

  const addAttachment = () => {
    setAttachments([...attachments, { id: Date.now().toString(), file: null, error: "" }])
  }

  const removeAttachment = (id: string) => {
    if (attachments.length > 1) {
      setAttachments(attachments.filter((att) => att.id !== id))
    }
  }

  const handleFileChange = (id: string, file: File | null) => {
    setAttachments(
      attachments.map((att) => {
        if (att.id === id) {
          let error = ""

          // Validation: File size ≤ 10MB
          if (file && file.size > 10 * 1024 * 1024) {
            error = t.fileSizeError
            return { ...att, file: null, error }
          }

          // Validation: Only PDF format
          if (file && file.type !== "application/pdf") {
            error = t.fileTypeError
            return { ...att, file: null, error }
          }

          return { ...att, file, error: "" }
        }
        return att
      }),
    )
  }

  // Calculate totals
  const calculateTotals = () => {
    const totals: Record<string, number> = {
      meals: 0,
      transportation: 0,
      flight: 0,
      employeeEngagement: 0,
      accommodation: 0,
      clientEntertainmentPotential: 0,
      clientEntertainmentExisting: 0,
      mileage: 0,
      petrol: 0,
      total: 0,
    }

    expenses.forEach((exp) => {
      const amount = Number.parseFloat(exp.amountBilling) || 0
      totals.total += amount

      if (exp.expenseType === "meals") totals.meals += amount
      else if (exp.expenseType === "transportation") totals.transportation += amount
      else if (exp.expenseType === "flight") totals.flight += amount
      else if (exp.expenseType === "employeeEngagement") totals.employeeEngagement += amount
      else if (exp.expenseType === "accommodation") totals.accommodation += amount
      else if (exp.expenseType === "clientEntertainmentPotential") totals.clientEntertainmentPotential += amount
      else if (exp.expenseType === "clientEntertainmentExisting") totals.clientEntertainmentExisting += amount
      else if (exp.expenseType === "mileage") totals.mileage += amount
      else if (exp.expenseType === "petrol") totals.petrol += amount
    })

    return totals
  }

  const totals = calculateTotals()

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Strip the data:...;base64, prefix
        const base64 = result.split(",")[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation: Required fields
    if (!company || !employeeName || !employeeIdent || !department || !date) {
      alert(t.requiredFieldsError)
      return
    }

    // Validation: Check if any attachments have errors or are empty
    const hasInvalidAttachments = attachments.some((att) => att.error !== "" || att.file === null)

    if (hasInvalidAttachments) {
      alert(t.attachmentError)
      return
    }

    setIsSubmitting(true)

    try {
      // Build the payload
      const payload: any = {
        company,
        employeeName,
        employeeIdent,
        department,
        date,
        billableToClient: isBillableToClient ? "yes" : "no",
        clientName: isBillableToClient ? clientName : "",
        purposeOfTravel,
        travelStartDate,
        travelEndDate,
        noOfDays: noOfDays ? Number(noOfDays) : 0,
        travelDestination,
        expenses: expenses.map((exp) => ({
          date: exp.date,
          particulars: exp.particulars,
          refNo: exp.refNo,
          currency: exp.currency,
          amountSource: Number.parseFloat(exp.amountSource) || 0,
          fxRate: Number.parseFloat(exp.fxRate) || 1,
          amountMYR: Number.parseFloat(exp.amountBilling) || 0,
          billableToClient: exp.billableToClient,
          expenseType: exp.expenseType,
        })),
        totals: {
          meals: totals.meals,
          transportation: totals.transportation,
          flight: totals.flight,
          employeeEngagement: totals.employeeEngagement,
          accommodation: totals.accommodation,
          clientEntertainmentPotential: totals.clientEntertainmentPotential,
          clientEntertainmentExisting: totals.clientEntertainmentExisting,
          mileage: totals.mileage,
          petrol: totals.petrol,
          total: totals.total,
        },
        submittedBy,
        language,
      }

      // Convert files to base64 and add to payload
      payload.attachments = await Promise.all(
        attachments.map(async (att) => {
          // attachments are validated above, but keep a small runtime guard
          if (!att.file) return null
          const base64Content = await fileToBase64(att.file)
          return {
            name: att.file.name,
            content: base64Content,
            contentType: att.file.type,
          }
        }),
      )
      payload.attachments = payload.attachments.filter(Boolean)

      // Send to Power Automate endpoint
      const powerAutomateUrl = process.env.NEXT_PUBLIC_POWER_AUTOMATE_URL
      if (!powerAutomateUrl) {
        throw new Error("Power Automate URL not configured")
      }
      const response = await fetch(powerAutomateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Submission failed")
      }

      // Success: Reset form and scroll to top
      alert(t.submitSuccess)

      // Reset form
      setCompany("")
      setEmployeeName("")
      setEmployeeIdent("")
      setDepartment("")
      setDate("")
      setIsBillableToClient(false)
      setClientName("")
      setPurposeOfTravel("")
      setTravelStartDate("")
      setTravelEndDate("")
      setNoOfDays("")
      setTravelDestination("")
      setSubmittedBy("")
      setExpenses([
        {
          id: "1",
          date: "",
          particulars: "",
          refNo: "",
          currency: "MYR",
          amountSource: "",
          fxRate: "1",
          amountBilling: "",
          billableToClient: false,
          expenseType: "meals",
        },
      ])
      setAttachments([{ id: "1", file: null, error: "" }])

      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      console.error("[v0] Submission error:", error)
      alert(t.submitError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header with logo placeholders and language selector */}
        <div className="flex items-center justify-between mb-8">
          <Image
            src="/TPLogo11.png"
            alt="Company Logo"
            width={120}
            height={60}
            className="object-contain"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Globe className="w-4 h-4" />
                {language === "en" ? "English" : language === "zh" ? "中文" : "日本語"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage("en")}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("zh")}>中文 (Chinese)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("ja")}>日本語 (Japanese)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card className="p-6 sm:p-8 bg-white border border-gray-300">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">{t.title}</h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">{t.basicInfo}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-gray-700">
                    {t.company} *
                  </Label>
                  <Select value={company} onValueChange={setCompany} required>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder={t.company} />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeName" className="text-gray-700">
                    {t.employeeName} *
                  </Label>
                  <Input
                    id="employeeName"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    required
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeIdent" className="text-gray-700">
                    {t.employeeIdent} *
                  </Label>
                  <Input
                    id="employeeIdent"
                    value={employeeIdent}
                    onChange={(e) => setEmployeeIdent(e.target.value)}
                    required
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-gray-700">
                    {t.department} *
                  </Label>
                  <Select value={department} onValueChange={setDepartment} required>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder={t.department} />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-gray-700">
                    {t.date} *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="border-gray-300"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="billable"
                  checked={isBillableToClient}
                  onCheckedChange={(checked) => setIsBillableToClient(checked === true)}
                />
                <div className="space-y-2 flex-1">
                  <Label htmlFor="billable" className="text-gray-700 cursor-pointer">
                    {t.billableToClient}
                  </Label>
                  {isBillableToClient && (
                    <Input
                      placeholder={t.clientNamePlaceholder}
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="border-gray-300"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Travel Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">
                {t.travelReimbursement}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purposeOfTravel" className="text-gray-700">
                    {t.purposeOfTravel}
                  </Label>
                  <Input
                    id="purposeOfTravel"
                    value={purposeOfTravel}
                    onChange={(e) => setPurposeOfTravel(e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travelStartDate" className="text-gray-700">
                    {t.travelStartDate}
                  </Label>
                  <Input
                    id="travelStartDate"
                    type="date"
                    value={travelStartDate}
                    onChange={(e) => setTravelStartDate(e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travelEndDate" className="text-gray-700">
                    {t.travelEndDate}
                  </Label>
                  <Input
                    id="travelEndDate"
                    type="date"
                    value={travelEndDate}
                    onChange={(e) => setTravelEndDate(e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="noOfDays" className="text-gray-700">
                    {t.noOfDays}
                  </Label>
                  <Input
                    id="noOfDays"
                    type="number"
                    min="0"
                    value={noOfDays}
                    readOnly
                    className="border-gray-300 bg-neutral-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travelDestination" className="text-gray-700">
                    {t.travelDestination}
                  </Label>
                  <Input
                    id="travelDestination"
                    value={travelDestination}
                    onChange={(e) => setTravelDestination(e.target.value)}
                    className="border-gray-300"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded border-l-4 border-gray-400">
                {t.travelNote}
              </p>
            </div>

            {/* Expenses Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-300 pb-2">
                  {t.expensesBreakdown}
                </h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={addExpenseRow}
                      size="sm"
                      className="gap-2 bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      <Plus className="w-4 h-4" />
                      {t.addExpense}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t.addExpenseTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded border-l-4 border-gray-400">
                {t.fxRateNote}
                <a
                  href="https://www.bnm.gov.my/exchange-rates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  https://www.bnm.gov.my/exchange-rates
                </a>
                {" (Bank Negara Malaysia)"}
              </p>

              <div className="overflow-x-auto">
                <div className="min-w-[1100px]">
                  {/* Header */}
                  <div className="grid grid-cols-[44px_80px_150px_100px_90px_100px_90px_100px_100px_minmax(180px,1fr)] gap-2 mb-2 text-sm font-semibold text-gray-700 bg-gray-100 p-2 rounded">
                    <div></div>
                    <div>{t.date}</div>
                    <div>{t.particulars}</div>
                    <div>{t.refNo}</div>
                    <div>{t.currency}</div>
                    <div>{t.amountSource}</div>
                    <div>{t.fxRate}</div>
                    <div>{t.amountMYR}</div>
                    <div className="flex items-center justify-center">{t.amountBillable}</div>
                    <div>{t.expenseType}</div>
                  </div>

                  {/* Expense Rows */}
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="grid grid-cols-[44px_80px_150px_100px_90px_100px_90px_100px_100px_minmax(180px,1fr)] gap-2 mb-2 items-center"
                    >
                      <div className="flex items-center justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExpenseRow(expense.id)}
                          disabled={expenses.length === 1}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                          title={expenses.length === 1 ? "" : "Remove row"}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input
                        type="date"
                        value={expense.date}
                        onChange={(e) => updateExpense(expense.id, "date", e.target.value)}
                        className="border-gray-300 text-sm"
                      />
                      <Input
                        value={expense.particulars}
                        onChange={(e) => updateExpense(expense.id, "particulars", e.target.value)}
                        placeholder={t.particularsPlaceholder}
                        className="border-gray-300 text-sm"
                      />
                      <Input
                        value={expense.refNo}
                        onChange={(e) => updateExpense(expense.id, "refNo", e.target.value)}
                        placeholder={t.refNoPlaceholder}
                        className="border-gray-300 text-sm"
                      />
                      <Select
                        value={expense.currency}
                        onValueChange={(value) => updateExpense(expense.id, "currency", value)}
                      >
                        <SelectTrigger className="border-gray-300 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={expense.amountSource}
                        onChange={(e) => updateExpense(expense.id, "amountSource", e.target.value)}
                        placeholder="0.00"
                        className="border-gray-300 text-sm"
                      />
                      <Input
                        type="number"
                        step="0.0001"
                        value={expense.fxRate}
                        onChange={(e) => updateExpense(expense.id, "fxRate", e.target.value)}
                        placeholder="1.0000"
                        className="border-gray-300 text-sm"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={expense.amountBilling}
                        readOnly
                        className="border-gray-300 bg-neutral-50 text-sm"
                      />
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={expense.billableToClient}
                          onCheckedChange={(checked) =>
                            updateExpense(expense.id, "billableToClient", checked === true)
                          }
                        />
                      </div>
                      <Select
                        value={expense.expenseType}
                        onValueChange={(value) => updateExpense(expense.id, "expenseType", value)}
                      >
                        <SelectTrigger className="border-gray-300 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="meals">{t.meals}</SelectItem>
                          <SelectItem value="transportation">{t.transportation}</SelectItem>
                          <SelectItem value="flight">{t.flight}</SelectItem>
                          <SelectItem value="employeeEngagement">{t.employeeEngagement}</SelectItem>
                          <SelectItem value="accommodation">{t.accommodation}</SelectItem>
                          <SelectItem value="clientEntertainmentPotential">{t.clientEntertainmentPotential}</SelectItem>
                          <SelectItem value="clientEntertainmentExisting">{t.clientEntertainmentExisting}</SelectItem>
                          <SelectItem value="mileage">{t.mileage}</SelectItem>
                          <SelectItem value="petrol">{t.petrol}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals - only show expense types that have been selected (non-zero) */}
              <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {totals.meals > 0 && (
                    <>
                      <div className="text-gray-700">{t.totalMeals}:</div>
                      <div className="font-semibold text-right">${totals.meals.toFixed(2)}</div>
                    </>
                  )}
                  {totals.transportation > 0 && (
                    <>
                      <div className="text-gray-700">{t.totalTransportation}:</div>
                      <div className="font-semibold text-right">${totals.transportation.toFixed(2)}</div>
                    </>
                  )}
                  {totals.flight > 0 && (
                    <>
                      <div className="text-gray-700">{t.totalFlight}:</div>
                      <div className="font-semibold text-right">${totals.flight.toFixed(2)}</div>
                    </>
                  )}
                  {totals.employeeEngagement > 0 && (
                    <>
                      <div className="text-gray-700">{t.totalEmployeeEngagement}:</div>
                      <div className="font-semibold text-right">${totals.employeeEngagement.toFixed(2)}</div>
                    </>
                  )}
                  {totals.accommodation > 0 && (
                    <>
                      <div className="text-gray-700">{t.totalAccommodation}:</div>
                      <div className="font-semibold text-right">${totals.accommodation.toFixed(2)}</div>
                    </>
                  )}
                  {totals.clientEntertainmentPotential > 0 && (
                    <>
                      <div className="text-gray-700">{t.totalClientEntertainmentPotential}:</div>
                      <div className="font-semibold text-right">${totals.clientEntertainmentPotential.toFixed(2)}</div>
                    </>
                  )}
                  {totals.clientEntertainmentExisting > 0 && (
                    <>
                      <div className="text-gray-700">{t.totalClientEntertainmentExisting}:</div>
                      <div className="font-semibold text-right">${totals.clientEntertainmentExisting.toFixed(2)}</div>
                    </>
                  )}
                  {totals.mileage > 0 && (
                    <>
                      <div className="text-gray-700">{t.totalMileage}:</div>
                      <div className="font-semibold text-right">${totals.mileage.toFixed(2)}</div>
                    </>
                  )}
                  {totals.petrol > 0 && (
                    <>
                      <div className="text-gray-700">{t.totalPetrol}:</div>
                      <div className="font-semibold text-right">${totals.petrol.toFixed(2)}</div>
                    </>
                  )}
                  <div className="text-lg font-bold text-gray-900 border-t border-gray-300 pt-2">{t.grandTotal}:</div>
                  <div className="text-lg font-bold text-right text-gray-900 border-t border-gray-300 pt-2">
                    ${totals.total.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-300 pb-2">
                  {t.attachments}
                </h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={addAttachment}
                      size="sm"
                      variant="outline"
                      className="gap-2 border-gray-400 text-gray-700 hover:bg-gray-100 bg-transparent"
                    >
                      <Plus className="w-4 h-4" />
                      {t.addAttachment}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t.addAttachmentTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded border-l-4 border-gray-400">
                {t.attachmentRenameNote}
              </p>

              <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded border-l-4 border-gray-400">
                {t.attachmentNote}
              </p>

              {attachments.map((attachment, index) => (
                <div key={attachment.id} className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`attachment-${attachment.id}`} className="text-gray-700">
                      {t.attachment} {index + 1}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`attachment-${attachment.id}`}
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          handleFileChange(attachment.id, file)
                        }}
                        className="border-gray-300"
                      />
                      {attachment.file && (
                        <span className="text-sm text-green-600 flex items-center gap-1">✓ {attachment.file.name}</span>
                      )}
                    </div>
                    {attachment.error && <p className="text-sm text-red-600 mt-1">{attachment.error}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttachment(attachment.id)}
                    disabled={attachments.length === 1}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Submitted By */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">{t.submittedBy}</h2>
              <div className="space-y-2">
                <Label htmlFor="submittedBy" className="text-gray-700">
                  {t.employeeNameSignature} *
                </Label>
                <Input
                  id="submittedBy"
                  value={submittedBy}
                  onChange={(e) => setSubmittedBy(e.target.value)}
                  required
                  placeholder={t.signaturePlaceholder}
                  className="border-gray-300"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto px-12 py-6 text-lg font-semibold bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t.submitting}
                  </>
                ) : (
                  t.submit
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </TooltipProvider>
  )
}

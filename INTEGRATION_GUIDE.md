# Power Automate Integration Guide

## Overview
This reimbursement form sends data to Power Automate in a structured JSON format with file attachments encoded in base64.

## Endpoint Configuration
Your Power Automate Flow endpoint is already configured in `components/reimbursement-form.tsx`.

## Request Payload Structure

The form sends a POST request with `Content-Type: application/json` containing:

### Basic Fields
```json
{
  "company": "string",
  "employeeName": "string",
  "department": "string",
  "site": "string",
  "date": "YYYY-MM-DD",
  "billableToClient": "yes" | "no",
  "clientName": "string (if billable)",
  "language": "en" | "zh" | "ja"
}
```

### Travel Information
```json
{
  "purposeOfTravel": "string",
  "travelPeriod": "string",
  "noOfDays": "string",
  "travelDestination": "string"
}
```

### Expenses Array
```json
{
  "expenses": [
    {
      "date": "YYYY-MM-DD",
      "particulars": "string",
      "refNo": "string",
      "currency": "MYR" | "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "SGD",
      "amountSource": number,
      "fxRate": number,
      "amountBilling": number,
      "amountBillable": number,
      "expenseType": "meals" | "transportation" | "other"
    }
  ]
}
```

### Totals
```json
{
  "totals": {
    "meals": number,
    "transportation": number,
    "other": number,
    "total": number
  }
}
```

### File Attachments
Files are converted to base64 and sent as:
```json
{
  "attachment1": {
    "name": "filename.pdf",
    "content": "base64-encoded-string",
    "contentType": "application/pdf"
  },
  "attachment2": { "..." },
  "...": "dynamic based on number of attachments"
}
```

### Submission
```json
{
  "submittedBy": "string"
}
```

## Complete Example Payload

```json
{
  "company": "ABC Corporation",
  "employeeName": "John Smith",
  "department": "Sales",
  "site": "New York Office",
  "date": "2024-01-15",
  "billableToClient": "yes",
  "clientName": "XYZ Client",
  "purposeOfTravel": "Client meeting",
  "travelPeriod": "2024-01-15 to 2024-01-17",
  "noOfDays": "3",
  "travelDestination": "Los Angeles",
  "expenses": [
    {
      "date": "2024-01-15",
      "particulars": "Lunch with client",
      "refNo": "INV-001",
      "currency": "USD",
      "amountSource": 50.00,
      "fxRate": 1,
      "amountBilling": 50.00,
      "amountBillable": 50.00,
      "expenseType": "meals"
    },
    {
      "date": "2024-01-16",
      "particulars": "Taxi to airport",
      "refNo": "REC-002",
      "currency": "USD",
      "amountSource": 35.00,
      "fxRate": 1,
      "amountBilling": 35.00,
      "amountBillable": 0,
      "expenseType": "transportation"
    }
  ],
  "totals": {
    "meals": 50.00,
    "transportation": 35.00,
    "other": 0,
    "total": 85.00
  },
  "attachment1": {
    "name": "receipt.pdf",
    "content": "JVBERi0xLjQKJeLjz9MKNCAwIG9iago8PC9UeXBlL...",
    "contentType": "application/pdf"
  },
  "attachment2": {
    "name": "boarding-pass.pdf",
    "content": "JVBERi0xLjQKJeLjz9MKNCAwIG9iago8PC9UeXBlL...",
    "contentType": "application/pdf"
  },
  "submittedBy": "John Smith",
  "language": "en"
}
```

## Power Automate Flow Setup

1. **HTTP Request Trigger**: Configure to accept POST requests with JSON body
2. **Parse JSON**: Use the schema derived from the example payload above
3. **File Handling**: 
   - Iterate through attachment fields (attachment1, attachment2, etc.)
   - Decode base64 content using `base64ToBinary(triggerBody()?['attachment1']?['content'])`
   - Save to SharePoint using "Create file" action
4. **Create SharePoint List Item**: Map fields from parsed JSON to SharePoint columns
5. **Response**: Return 200 OK on success

## How Multiple Expenses and Documents Are Sent

### Multiple Expense Rows (e.g., 10 expenses)
All expense rows are sent as a **single JSON array** in the `expenses` field. Each row is an object in the array:

```json
{
  "expenses": [
    { "date": "2024-01-15", "particulars": "Lunch", "currency": "MYR", "amountSource": 50, ... },
    { "date": "2024-01-16", "particulars": "Taxi", "currency": "MYR", "amountSource": 35, ... },
    { "date": "2024-01-17", "particulars": "Hotel", "currency": "MYR", "amountSource": 200, ... },
    // ... up to 10+ rows
  ]
}
```

### Multiple Documents (e.g., 5 PDFs)
Each document is sent as a **separate field** with numbered keys:

```json
{
  "attachment1": { "name": "receipt1.pdf", "content": "base64...", "contentType": "application/pdf" },
  "attachment2": { "name": "receipt2.pdf", "content": "base64...", "contentType": "application/pdf" },
  "attachment3": { "name": "receipt3.pdf", "content": "base64...", "contentType": "application/pdf" },
  "attachment4": { "name": "receipt4.pdf", "content": "base64...", "contentType": "application/pdf" },
  "attachment5": { "name": "receipt5.pdf", "content": "base64...", "contentType": "application/pdf" }
}
```

## SharePoint Storage Recommendations

### Option 1: SharePoint List + Document Library (Recommended)

**For Expense Data - Create a SharePoint List with columns:**
| Column Name | Type | Notes |
|-------------|------|-------|
| RequestID | Single line text | Auto-generated unique ID |
| EmployeeName | Single line text | |
| Company | Single line text | |
| Department | Single line text | |
| SubmissionDate | Date | |
| TotalAmount | Number (2 decimals) | |
| ExpensesJSON | Multiple lines text | Store entire expenses array as JSON string |
| Status | Choice | Pending/Approved/Rejected |

**For Documents - Create a Document Library:**
- Create a folder per submission using RequestID
- Upload all attachments to that folder
- Store the folder path in the List item

### Power Automate Flow Steps:

```
1. HTTP Request Trigger (receives JSON)
         ↓
2. Initialize Variable: RequestID = concat('REQ-', utcNow('yyyyMMddHHmmss'))
         ↓
3. Create Folder in Document Library
   Site: Your SharePoint Site
   Folder Path: /Reimbursements/[RequestID]
         ↓
4. Apply to Each: Loop through attachments
   ├─ Check if attachment exists (e.g., triggerBody()?['attachment1'])
   ├─ Create File in Document Library
   │   File Name: [attachment1.name]
   │   File Content: base64ToBinary([attachment1.content])
   │   Folder Path: /Reimbursements/[RequestID]
         ↓
5. Create Item in SharePoint List
   Map all form fields to list columns
   ExpensesJSON: string(triggerBody()?['expenses'])
         ↓
6. Response: 200 OK
```

### Option 2: Store Each Expense as Separate List Item

If you need to query/filter individual expenses, create an **Expenses List**:

| Column Name | Type |
|-------------|------|
| RequestID | Single line text (lookup) |
| ExpenseDate | Date |
| Particulars | Single line text |
| RefNo | Single line text |
| Currency | Choice (MYR/USD/EUR/etc.) |
| AmountSource | Number |
| FXRate | Number |
| AmountBilling | Number |
| ExpenseType | Choice (meals/transportation/other) |

**Flow Steps:**
```
Apply to Each: items = triggerBody()?['expenses']
  └─ Create Item in Expenses List for each expense
```

### Key Expressions for Power Automate:

```
// Get attachment count dynamically
length(split(string(triggerBody()), 'attachment'))

// Check if attachment exists
if(empty(triggerBody()?['attachment1']), false, true)

// Decode base64 to binary
base64ToBinary(triggerBody()?['attachment1']?['content'])

// Convert expenses array to string for storage
string(triggerBody()?['expenses'])

// Parse stored JSON back to array (in another flow)
json(items('SharePointListItem')?['ExpensesJSON'])
```

## Validation Rules

Client-side validation ensures:
- Required fields are not empty
- File size ≤ 10MB per file
- Only PDF files accepted
- Valid date formats
- Numeric fields contain valid numbers

## Error Handling

The form displays alerts for:
- Missing required fields
- Invalid file uploads
- Network errors during submission
- Server errors (non-200 responses)

## Security Considerations

- Use HTTPS for the Power Automate endpoint
- Implement authentication in Power Automate (API key, OAuth)
- Validate all inputs server-side in Power Automate
- Scan uploaded files for malware
- Set appropriate file size limits in Power Automate

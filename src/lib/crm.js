export const today = () => new Date().toLocaleDateString("en-CA");
const AC = ["Split AC", "Cassette AC", "VRV", "VRF", "AHU", "Chiller"];

export const MODULES = {
  enquiries: {
    title: "Enquiries / Leads",
    prefix: "ENQ",
    statusKey: "status",
    dateKey: "followUp",
    done: ["Converted", "Lost"],
    fields: [
      { k: "name", l: "Customer name" },
      { k: "phone", l: "Phone" },
      {
        k: "source",
        l: "Enquiry source",
        opts: ["WhatsApp", "Phone", "Website", "Reference"],
      },
      { k: "assignedTo", l: "Assigned to", emp: 1 },
      { k: "followUp", l: "Next follow-up date", type: "date" },
      {
        k: "status",
        l: "Lead status",
        opts: ["New", "Pending", "Interested", "Converted", "Lost"],
      },
      { k: "notes", l: "Notes", type: "textarea" },
    ],
    cols: ["name", "phone", "source", "assignedTo", "followUp", "status"],
  },
  customers: {
    title: "Customers",
    prefix: "CUS",
    fields: [
      { k: "name", l: "Customer name" },
      { k: "phone", l: "Phone" },
      { k: "address", l: "Address", type: "textarea" },
      { k: "gst", l: "GST number" },
      { k: "notes", l: "Notes", type: "textarea" },
    ],
    cols: ["name", "phone", "address", "gst"],
  },
  quotations: {
    title: "Quotations",
    prefix: "QUO",
    statusKey: "status",
    dateKey: "followUp",
    done: ["Approved", "Rejected"],
    fields: [
      { k: "name", l: "Customer name", cust: 1 },
      { k: "phone", l: "Phone" },
      { k: "details", l: "Scope / materials", type: "textarea" },
      { k: "amount", l: "Quotation amount (₹)", type: "number" },
      {
        k: "status",
        l: "Status",
        opts: ["Draft", "Sent", "Approved", "Rejected"],
      },
      { k: "followUp", l: "Next follow-up date", type: "date" },
    ],
    cols: ["name", "phone", "amount", "followUp", "status"],
  },
  projects: {
    title: "Projects",
    prefix: "PRJ",
    statusKey: "status",
    dateKey: "followUp",
    done: ["Completed"],
    report: "Installation Handover Report",
    fields: [
      { k: "name", l: "Project name" },
      { k: "customer", l: "Customer", cust: 1 },
      { k: "phone", l: "Customer phone" },
      { k: "location", l: "Project location" },
      { k: "acType", l: "AC type", opts: AC },
      { k: "capacity", l: "AC capacity / tonnage (e.g. 20 TR)" },
      { k: "startDate", l: "Start date", type: "date" },
      { k: "endDate", l: "Completion date", type: "date" },
      { k: "supervisor", l: "Supervisor", emp: 1 },
      { k: "technician", l: "Technician", emp: 1 },
      {
        k: "status",
        l: "Project status",
        opts: ["Planned", "In Progress", "Completed", "On Hold"],
      },
      { k: "progress", l: "Progress %", type: "number" },
      { k: "materials", l: "Material requirement / usage", type: "textarea" },
      { k: "amount", l: "Project amount (₹)", type: "number" },
      { k: "paid", l: "Received so far (₹)", type: "number" },
      { k: "handover", l: "Customer handover", opts: ["Pending", "Signed"] },
      { k: "followUp", l: "Next follow-up date", type: "date" },
    ],
    computed: {
      balance: ["Balance ₹", (r) => (+r.amount || 0) - (+r.paid || 0)],
    },
    cols: [
      "name",
      "customer",
      "supervisor",
      "technician",
      "status",
      "progress",
      "balance",
      "followUp",
    ],
  },
  services: {
    title: "Services",
    prefix: "SRV",
    statusKey: "status",
    dateKey: "followUp",
    done: ["Completed"],
    report: "Service Completion Report",
    fields: [
      { k: "customer", l: "Customer name", cust: 1 },
      { k: "phone", l: "Phone" },
      { k: "complaint", l: "Complaint / service request", type: "textarea" },
      { k: "acType", l: "AC type", opts: AC },
      { k: "technician", l: "Technician assigned", emp: 1 },
      { k: "visitDate", l: "Service visit date", type: "date" },
      {
        k: "status",
        l: "Status",
        opts: ["New", "Assigned", "In Progress", "Completed"],
      },
      { k: "spares", l: "Spare parts used", type: "textarea" },
      {
        k: "feedback",
        l: "Customer feedback",
        opts: ["Excellent", "Good", "Average", "Poor"],
      },
      { k: "followUp", l: "Next follow-up date", type: "date" },
    ],
    cols: [
      "customer",
      "phone",
      "acType",
      "technician",
      "visitDate",
      "status",
      "followUp",
    ],
  },
  amc: {
    title: "AMC",
    prefix: "AMC",
    statusKey: "paymentStatus",
    dateKey: "nextService",
    done: [],
    fields: [
      { k: "customer", l: "AMC customer", cust: 1 },
      { k: "phone", l: "Phone" },
      { k: "startDate", l: "AMC start date", type: "date" },
      { k: "expiry", l: "AMC expiry date", type: "date" },
      { k: "amount", l: "Contract amount (₹)", type: "number" },
      { k: "frequency", l: "Service schedule", opts: ["Monthly", "Quarterly"] },
      { k: "nextService", l: "Next preventive service date", type: "date" },
      {
        k: "paymentStatus",
        l: "Payment status",
        opts: ["Paid", "Partial", "Pending"],
      },
      { k: "notes", l: "Notes", type: "textarea" },
    ],
    cols: [
      "customer",
      "phone",
      "expiry",
      "amount",
      "frequency",
      "nextService",
      "paymentStatus",
    ],
  },
  payments: {
    title: "Payments & Invoices",
    prefix: "PAY",
    statusKey: "paymentStatus",
    dateKey: "dueDate",
    done: ["Paid"],
    fields: [
      { k: "customer", l: "Customer / supplier", cust: 1 },
      {
        k: "type",
        l: "Type",
        opts: [
          "Invoice",
          "GST Invoice",
          "Advance",
          "Receipt",
          "Supplier payment",
        ],
      },
      { k: "invoiceNo", l: "Invoice number" },
      { k: "gstNo", l: "GST number (for GST invoice)" },
      { k: "amount", l: "Total amount (₹)", type: "number" },
      { k: "paid", l: "Paid so far (₹)", type: "number" },
      { k: "dueDate", l: "Payment due date", type: "date" },
      { k: "paymentStatus", l: "Status", opts: ["Pending", "Partial", "Paid"] },
      { k: "notes", l: "Notes", type: "textarea" },
    ],
    computed: {
      balance: ["Outstanding ₹", (r) => (+r.amount || 0) - (+r.paid || 0)],
    },
    cols: [
      "customer",
      "type",
      "invoiceNo",
      "amount",
      "paid",
      "balance",
      "dueDate",
      "paymentStatus",
    ],
  },
  dailyWork: {
    title: "Daily work update",
    prefix: "DW",
    statusKey: "status",
    dateKey: "followUp",
    done: ["Done"],
    fields: [
      { k: "employee", l: "Employee", emp: 1 },
      { k: "date", l: "Date", type: "date" },
      { k: "site", l: "Customer / project / service ID" },
      { k: "work", l: "Work done today", type: "textarea" },
      { k: "materials", l: "Material used / required", type: "textarea" },
      {
        k: "status",
        l: "Status",
        opts: ["Done", "Pending", "Follow-up needed"],
      },
      { k: "followUp", l: "Next follow-up date", type: "date" },
    ],
    cols: ["date", "employee", "site", "work", "status"],
  },
};

export const newId = (a, prefix) =>
  prefix +
  "-" +
  String(
    Math.max(0, ...a.map((x) => parseInt(String(x.id).split("-")[1]) || 0)) + 1,
  ).padStart(3, "0");

export const isOverdue = (m, r) =>
  !!(
    m.dateKey &&
    r[m.dateKey] &&
    r[m.dateKey] < today() &&
    !(m.done || []).includes(r[m.statusKey])
  );

export const renewalDue = (m, r) => {
  if (!r.expiry || m.prefix !== "AMC") return false;
  const lim = new Date();
  lim.setDate(lim.getDate() + 30);
  return r.expiry <= lim.toLocaleDateString("en-CA");
};

export async function makeReport(m, r, company, empName) {
  const { jsPDF } = await import("jspdf");
  const d = new jsPDF();
  d.setFontSize(16);
  d.text(company.name || "", 14, 18);
  d.setFontSize(9);
  d.text(d.splitTextToSize(company.address || "", 180), 14, 24);
  d.setFontSize(13);
  d.text(`${m.report} - ${r.id}`, 14, 38);
  d.setFontSize(10);
  let y = 50;
  m.fields.forEach((x) => {
    const v = x.emp ? empName(r[x.k]) : r[x.k];
    const t = d.splitTextToSize(`${x.l}: ${v || "-"}`, 180);
    if (y + t.length * 5 > 260) {
      d.addPage();
      y = 20;
    }
    d.text(t, 14, y);
    y += t.length * 5 + 2;
  });
  y = Math.max(y + 20, 250);
  if (y > 275) {
    d.addPage();
    y = 40;
  }
  d.text(
    "Customer signature: ____________________     Date: ____________",
    14,
    y,
  );
  d.text("Technician / Supervisor: ____________________", 14, y + 14);
  d.save(`${m.report.replace(/\s+/g, "_")}_${r.id}.pdf`);
}

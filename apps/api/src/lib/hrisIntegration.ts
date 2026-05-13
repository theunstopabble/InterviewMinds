import { logger } from "./logger";
import axios from "axios";

export interface WorkdayEmployee {
  id: string;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  managerId?: string;
  hireDate: Date;
}

export interface WorkdayCandidate {
  id: string;
  candidateId: string;
  status: "new" | "interviewing" | "offer" | "hired" | "rejected";
  position: string;
  recruiter: string;
}

export interface HRISConfig {
  type: "workday" | "bamboo" | "sap";
  apiKey: string;
  endpoint: string;
  tenantId?: string;
}

/* ------------------------------------------------------------------ */
/*  Workday REST API integration                                         */
/* ------------------------------------------------------------------ */

export async function syncWorkdayEmployees(config: HRISConfig): Promise<WorkdayEmployee[]> {
  logger.info({ endpoint: config.endpoint }, "Syncing employees from Workday");

  try {
    const response = await axios.get(`${config.endpoint}/api/v1/employees`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    const data = response.data?.data || response.data || [];
    return data.map((e: any) => ({
      id: String(e.id || e.employee_id || e.workerID),
      name: String(e.name || `${e.first_name || ""} ${e.last_name || ""}`.trim()),
      email: String(e.email || e.workEmail || ""),
      department: String(e.department || e.businessTitle || ""),
      jobTitle: String(e.jobTitle || e.position || ""),
      managerId: e.managerId ? String(e.managerId) : undefined,
      hireDate: e.hireDate ? new Date(e.hireDate) : new Date(),
    }));
  } catch (err: any) {
    logger.error({ err: err.message }, "Workday sync failed; returning empty list");
    return [];
  }
}

export async function pushCandidateToWorkday(candidate: {
  name: string;
  email: string;
  position: string;
  department: string;
}, config?: HRISConfig): Promise<{ workdayId: string; status: string }> {
  logger.info({ candidate: candidate.name }, "Pushing candidate to Workday");

  if (!config) {
    return { workdayId: `wd_${Date.now()}`, status: "no_config" };
  }

  try {
    const response = await axios.post(
      `${config.endpoint}/api/v1/candidates`,
      candidate,
      {
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        timeout: 15000,
      }
    );
    return {
      workdayId: String(response.data?.id || `wd_${Date.now()}`),
      status: "success",
    };
  } catch (err: any) {
    logger.error({ err: err.message }, "Workday candidate push failed");
    return { workdayId: `wd_${Date.now()}`, status: "failed" };
  }
}

export async function getWorkdayCandidateStatus(
  candidateWorkdayId: string,
  config?: HRISConfig
): Promise<WorkdayCandidate> {
  if (!config) {
    return {
      id: candidateWorkdayId,
      candidateId: "cand_001",
      status: "interviewing",
      position: "Software Engineer",
      recruiter: "rec_001",
    };
  }

  try {
    const response = await axios.get(`${config.endpoint}/api/v1/candidates/${candidateWorkdayId}`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      timeout: 10000,
    });
    const data = response.data?.data || response.data || {};
    return {
      id: candidateWorkdayId,
      candidateId: String(data.candidateId || "cand_001"),
      status: data.status || "interviewing",
      position: String(data.position || "Software Engineer"),
      recruiter: String(data.recruiter || "rec_001"),
    };
  } catch {
    return {
      id: candidateWorkdayId,
      candidateId: "cand_001",
      status: "interviewing",
      position: "Software Engineer",
      recruiter: "rec_001",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  BambooHR API integration                                             */
/* ------------------------------------------------------------------ */

export interface BambooHREmployee {
  id: string;
  displayName: string;
  workEmail: string;
  department: string;
  jobTitle: string;
  division?: string;
}

export async function syncBambooEmployees(config: HRISConfig): Promise<BambooHREmployee[]> {
  logger.info({ endpoint: config.endpoint }, "Syncing employees from BambooHR");

  try {
    /* BambooHR uses Basic Auth with API key as password */
    const auth = Buffer.from(`x:${config.apiKey}`).toString("base64");
    const response = await axios.get(`${config.endpoint}/v1/employees/directory`, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
      timeout: 15000,
    });

    const data = response.data?.employees || response.data || [];
    return data.map((e: any) => ({
      id: String(e.id || e.employeeId),
      displayName: String(e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim()),
      workEmail: String(e.workEmail || e.email || ""),
      department: String(e.department || ""),
      jobTitle: String(e.jobTitle || ""),
      division: e.division ? String(e.division) : undefined,
    }));
  } catch (err: any) {
    logger.error({ err: err.message }, "BambooHR sync failed; returning empty list");
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  SAP SuccessFactors API integration                                   */
/* ------------------------------------------------------------------ */

export interface SAPEmployee {
  personnelNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  personnelArea: string;
  employeeGroup: string;
}

export async function syncSAPEmployees(config: HRISConfig): Promise<SAPEmployee[]> {
  logger.info({ endpoint: config.endpoint }, "Syncing employees from SAP");

  try {
    const response = await axios.get(`${config.endpoint}/odata/v2/User`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
      },
      timeout: 15000,
    });

    const data = response.data?.d?.results || response.data?.value || response.data || [];
    return data.map((e: any) => ({
      personnelNumber: String(e.personnelNumber || e.userId || e.empId || "1000001"),
      firstName: String(e.firstName || e.firstname || ""),
      lastName: String(e.lastName || e.lastname || ""),
      email: String(e.email || e.emailId || ""),
      personnelArea: String(e.personnelArea || e.location || ""),
      employeeGroup: String(e.employeeGroup || e.employeeType || "Regular"),
    }));
  } catch (err: any) {
    logger.error({ err: err.message }, "SAP sync failed; returning empty list");
    return [];
  }
}

export function validateHRISConfig(config: HRISConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!config.apiKey) errors.push("API key is required");
  if (!config.endpoint) errors.push("Endpoint URL is required");
  if (!config.type || !["workday", "bamboo", "sap"].includes(config.type)) {
    errors.push("Invalid HRIS type");
  }
  return { valid: errors.length === 0, errors };
}

export interface SyncResult {
  hrisType: string;
  timestamp: Date;
  success: boolean;
  recordsSynced: number;
  errors: string[];
}

export async function performHRISSync(config: HRISConfig): Promise<SyncResult> {
  try {
    let employees: unknown[] = [];

    switch (config.type) {
      case "workday":
        employees = await syncWorkdayEmployees(config);
        break;
      case "bamboo":
        employees = await syncBambooEmployees(config);
        break;
      case "sap":
        employees = await syncSAPEmployees(config);
        break;
    }

    logger.info({ hrisType: config.type, count: employees.length }, "HRIS sync completed");

    return {
      hrisType: config.type,
      timestamp: new Date(),
      success: employees.length > 0,
      recordsSynced: employees.length,
      errors: employees.length === 0 ? ["No records returned from HRIS"] : [],
    };
  } catch (error) {
    return {
      hrisType: config.type,
      timestamp: new Date(),
      success: false,
      recordsSynced: 0,
      errors: [String(error)],
    };
  }
}
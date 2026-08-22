export interface TeacherProfile {
  uid: string;
  fullName: string;
  title: string;
  phone: string;
  email: string;
  school: string;
  schoolID: string;
  level: string;
  province: string;
  district: string;
  commune: string;
  village: string;
  position?: string;
  expectedTotalStudents?: number;
  expectedFemaleStudents?: number;
  createdAt: number;
}

export interface Student {
  id: string;
  code?: string;
  lastName: string;
  firstName: string;
  gender: 'ប្រុស' | 'ស្រី' | string;
  dob?: string;
  age?: string;
  fatherName?: string;
  fatherJob?: string;
  motherName?: string;
  motherJob?: string;
  village?: string;
  commune?: string;
  district?: string;
  province?: string;
  phone?: string;
  photoUrl?: string;
  latinName?: string;
  _rank?: number | string;
  _avgVal?: number | string;
  _grade?: string;
  _resultText?: string;
  _selClass?: string;
  _schoolName?: string;
  _teacherName?: string;
}

export interface ScoreMap {
  [subject: string]: number | string;
}

export interface AttendanceMap {
  [day: number]: 'P' | 'A' | '';
}

export interface SupervisorInfo {
  name: string;
  phone: string;
  sig: string;
}

export interface InvigilatorData {
  building: string;
  room: string;
  shift: 'ព្រឹក' | 'ល្ងាច' | string;
  sup1: SupervisorInfo;
  sup2: SupervisorInfo;
}

export interface CoreGradeRecord {
  khmerComponents: Record<string, string | null>;
  khmerAvg: number | null;
  khmerGrade: string | null;
  mathComponents: Record<string, string | null>;
  mathAvg: number | null;
  mathGrade: string | null;
  savedAt?: string;
}

export interface PtomRecord {
  familyStatus?: string;
  khmerBaseline?: string;
  mathBaseline?: string;

  khmerQ1Plan?: string;
  khmerQ1Actual?: string;
  khmerQ2Plan?: string;
  khmerQ2Actual?: string;
  khmerQ3Plan?: string;
  khmerQ3Actual?: string;
  khmerQ4Plan?: string;
  khmerQ4Actual?: string;

  mathQ1Plan?: string;
  mathQ1Actual?: string;
  mathQ2Plan?: string;
  mathQ2Actual?: string;
  mathQ3Plan?: string;
  mathQ3Actual?: string;
  mathQ4Plan?: string;
  mathQ4Actual?: string;

  updatedAt?: number;
}

export type InnerTab = 'info' | 'scores' | 'attendance' | 'detail' | 'report' | 'schoolreport' | 'prischool' | 'candidate' | 'certificate' | 'honor' | 'gradeanalysis' | 'performance';

export type ReportType = 'monthly' | 'semester' | 'detail' | 'annual' | 'attendance' | 'studentcard' | 'candidate' | 'certificate' | 'coregrade' | 'traineebook' | 'agreement' | 'pri' | 'qr_sheet';

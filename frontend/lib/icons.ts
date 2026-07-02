import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Database,
  ExternalLink,
  FileSearch,
  ListChecks,
  Loader2,
  Mail,
  ShieldCheck,
  XCircle,
} from "lucide-react";

export const icons = {
  action: ArrowRight,
  blocked: XCircle,
  database: Database,
  error: AlertTriangle,
  externalLink: ExternalLink,
  loading: Loader2,
  mail: Mail,
  orderReview: FileSearch,
  pending: CircleDashed,
  readiness: ListChecks,
  review: Clock3,
  success: CheckCircle2,
  trust: ShieldCheck,
} as const;

export type IconName = keyof typeof icons;

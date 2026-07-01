"use client";

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  BrainCircuit,
  FileText,
  LoaderCircle,
  Paperclip,
  Search,
  Shield,
  UserSquare2,
  Users,
  X
} from "lucide-react";
import type {
  AuthenticatedUser,
  ClassificationFolderOption,
  DepartementListItem,
  DocumentClassificationProposal,
  DocumentIntelligenceAnalyzeResponse,
  DocumentIntelligenceJobStatus,
  DocumentIntelligenceJobStatusView,
  DocumentIntelligenceReadiness,
  DocumentIntelligenceResultView,
  DocumentTypeOption,
  User
} from "@sigeda/shared/types";
import { confidentialityLevels, documentTypes as legacyDocumentTypes } from "@sigeda/shared/constants";

import { DocumentUploadStatus } from "@/components/documents/document-upload-status";
import { Card } from "@/components/ui/card";
import { authorizedRequest, getDisplayableErrorMessage } from "@/lib/client-http";
import { getPublicOnPremiseApiBaseUrl } from "@/lib/env";
import { formatShortDate, formatStructureLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

type DocumentCreateFormProps = {
  directions: DepartementListItem[];
  departments: DepartementListItem[];
  users: User[];
  currentUser: AuthenticatedUser | null;
  documentTypes: DocumentTypeOption[];
};

type CreatedDocumentSummary = {
  createdAt?: string;
  id: string;
  reference: string;
  title: string;
};

type SignerCandidateApiPayload = {
  id: string;
  email?: string;
  matricule: string;
  nom: string;
  prenom: string;
  isActive?: boolean;
  role: {
    code: string;
    name: string;
  };
  directionId?: string | null;
  serviceId?: string | null;
  bureauId?: string | null;
};

type DirectionSelectionFieldProps = {
  directionLookup: Map<string, DepartementListItem>;
  emptyState: string;
  helperText?: string;
  label: string;
  onRemove: (id: string) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  options: DepartementListItem[];
  readOnly?: boolean;
  searchValue: string;
  selectedIds: string[];
};

type CopyTargetOption = {
  key: string;
  targetKind: "DIRECTION_GENERALE" | "DIRECTION" | "SERVICE" | "BUREAU" | "USER";
  targetDepartmentId?: string;
  targetUserId?: string;
  directionId: string;
  label: string;
  searchText: string;
};

type CopyTargetSelectionFieldProps = {
  emptyState: string;
  helperText?: string;
  label: string;
  onRemove: (key: string) => void;
  onSearchChange: (value: string) => void;
  onSelect: (key: string) => void;
  options: CopyTargetOption[];
  optionLookup: Map<string, CopyTargetOption>;
  readOnly?: boolean;
  searchValue: string;
  selectedKeys: string[];
};

type SignerSelectionFieldProps = {
  emptyState: string;
  onMove: (id: string, direction: "up" | "down") => void;
  onRemove: (id: string) => void;
  onSearchChange: (value: string) => void;
  onToggle: (id: string) => void;
  searchValue: string;
  selectedIds: string[];
  userLookup: Map<string, User>;
  users: User[];
};

type AnalysisSummary = {
  confidenceScore: number | null;
  confidentialityLevel: string;
  copyDirections: string[];
  documentDate: string;
  documentType: string;
  effectiveMode: "vision" | "ocr" | "hybrid" | null;
  emitterDirection: string;
  matching: DocumentIntelligenceResultView["matching"];
  reference: string;
  receiverDirections: string[];
  signers: string[];
  title: string;
  subject: string;
};

const ANALYSIS_POLL_INTERVAL_MS = 500;
const ANALYSIS_RESULT_RETRY_MS = 250;
const ANALYSIS_RESULT_MAX_ATTEMPTS = 3;
const ANALYSIS_SOFT_WAIT_MS = 40_000;
const ANALYSIS_HARD_WAIT_MS = 180_000;

const confidentialityToneMap: Record<(typeof confidentialityLevels)[number], string> = {
  PUBLIC: "border-emerald-200 bg-emerald-50 text-emerald-800",
  INTERNE: "border-slate-200 bg-slate-100 text-slate-800",
  CONFIDENTIEL: "border-amber-200 bg-amber-50 text-amber-900",
  SECRET: "border-rose-200 bg-rose-50 text-rose-900",
  TRES_SECRET: "border-red-200 bg-red-50 text-red-900"
};

export function DocumentCreateForm({
  directions,
  departments,
  users,
  currentUser,
  documentTypes
}: DocumentCreateFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const apiBaseUrl = getPublicOnPremiseApiBaseUrl();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedSignerIds, setSelectedSignerIds] = useState<string[]>([]);
  const [pendingAnalysisSignerIds, setPendingAnalysisSignerIds] = useState<string[]>([]);
  const [temporaryPrefilledSigners, setTemporaryPrefilledSigners] = useState<User[]>([]);
  const [selectedReceiverIds, setSelectedReceiverIds] = useState<string[]>([]);
  const [selectedCopyTargetKeys, setSelectedCopyTargetKeys] = useState<string[]>([]);
  const [receiverSearch, setReceiverSearch] = useState("");
  const [copySearch, setCopySearch] = useState("");
  const [signerSearch, setSignerSearch] = useState("");
  const [selectedConfidentialityLevel, setSelectedConfidentialityLevel] =
    useState<(typeof confidentialityLevels)[number]>("INTERNE");
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdDocument, setCreatedDocument] = useState<CreatedDocumentSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmitterDirectionId, setSelectedEmitterDirectionId] = useState(currentUser?.directionId ?? "");
  const [signerCandidates, setSignerCandidates] = useState<User[]>([]);
  const [signerLoadError, setSignerLoadError] = useState<string | null>(null);
  const [isLoadingSigners, setIsLoadingSigners] = useState(false);
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<DocumentIntelligenceJobStatus | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReadiness, setAnalysisReadiness] = useState<DocumentIntelligenceReadiness | null>(null);
  const [isLoadingAnalysisReadiness, setIsLoadingAnalysisReadiness] = useState(true);
  const [classificationProposal, setClassificationProposal] = useState<DocumentClassificationProposal | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [isLoadingClassificationProposal, setIsLoadingClassificationProposal] = useState(false);
  const [classificationProposalError, setClassificationProposalError] = useState<string | null>(null);
  const [folderSelectionDirty, setFolderSelectionDirty] = useState(false);

  const selectableDirections = useMemo(
    () => directions.filter((direction) => direction.type === "Direction" || direction.type === "Direction Generale"),
    [directions]
  );
  const currentDirection = selectableDirections.find((direction) => direction.id === currentUser?.directionId) ?? null;
  const selectedEmitterDirection =
    selectableDirections.find((direction) => direction.id === selectedEmitterDirectionId) ?? currentDirection ?? null;
  const emitterDirectionId = selectedEmitterDirectionId || currentUser?.directionId || "";
  const isIncomingDocument = Boolean(currentUser?.directionId && emitterDirectionId && emitterDirectionId !== currentUser.directionId);
  const selectableSigners = useMemo(
    () => mergeSignerCandidates(signerCandidates, temporaryPrefilledSigners),
    [signerCandidates, temporaryPrefilledSigners]
  );
  const lockedReceiverIds = isIncomingDocument && currentUser?.directionId ? [currentUser.directionId] : [];
  const effectiveReceiverIds = isIncomingDocument ? lockedReceiverIds : selectedReceiverIds;
  const signerSourceLabel = useMemo(() => {
    if (!selectedEmitterDirection) {
      return null;
    }

    if (selectedEmitterDirection.type === "Direction Generale") {
      return selectedEmitterDirection.designation;
    }

    const parentGeneralDirection = selectableDirections.find(
      (direction) => direction.id === selectedEmitterDirection.parentId && direction.type === "Direction Generale"
    );

    return parentGeneralDirection
      ? `${selectedEmitterDirection.designation} + ${parentGeneralDirection.designation}`
      : selectedEmitterDirection.designation;
  }, [selectableDirections, selectedEmitterDirection]);
  const directionCandidates = useMemo(
    () => selectableDirections.filter((direction) => direction.id !== emitterDirectionId),
    [emitterDirectionId, selectableDirections]
  );
  const directionLookup = useMemo(
    () => new Map(directionCandidates.map((direction) => [direction.id, direction])),
    [directionCandidates]
  );
  const copyTargetOptions = useMemo(
    () => buildCopyTargetOptions({ departments, directions: selectableDirections, users, currentUserId: currentUser?.id }),
    [currentUser?.id, departments, selectableDirections, users]
  );
  const copyTargetLookup = useMemo(
    () => new Map(copyTargetOptions.map((option) => [option.key, option])),
    [copyTargetOptions]
  );
  const signerLookup = useMemo(
    () => new Map(selectableSigners.map((user) => [user.id, user])),
    [selectableSigners]
  );
  const selectedCopyTargetOptions = useMemo(
    () => selectedCopyTargetKeys.map((key) => copyTargetLookup.get(key)).filter(Boolean) as CopyTargetOption[],
    [copyTargetLookup, selectedCopyTargetKeys]
  );
  const selectedCopyDirectionIds = useMemo(
    () => uniqueIds(selectedCopyTargetOptions.map((option) => option.directionId)),
    [selectedCopyTargetOptions]
  );
  const normalizedClassificationReceiverIds = useMemo(
    () => uniqueIds(effectiveReceiverIds).filter((directionId) => directionId !== emitterDirectionId),
    [effectiveReceiverIds, emitterDirectionId]
  );
  const normalizedClassificationCopyTargetOptions = useMemo(
    () =>
      selectedCopyTargetOptions.filter(
        (option) =>
          option.directionId !== emitterDirectionId &&
          !normalizedClassificationReceiverIds.includes(option.directionId)
      ),
    [emitterDirectionId, normalizedClassificationReceiverIds, selectedCopyTargetOptions]
  );
  const normalizedClassificationCopyDirectionIds = useMemo(
    () => uniqueIds(normalizedClassificationCopyTargetOptions.map((option) => option.directionId)),
    [normalizedClassificationCopyTargetOptions]
  );
  const filteredReceiverOptions = useMemo(
    () =>
      directionCandidates.filter(
        (direction) =>
          !normalizedClassificationCopyDirectionIds.includes(direction.id) &&
          matchesDirectionSearch(direction, receiverSearch)
      ),
    [directionCandidates, normalizedClassificationCopyDirectionIds, receiverSearch]
  );
  const filteredCopyOptions = useMemo(
    () => copyTargetOptions.filter((option) => canSelectCopyTarget(option, selectedReceiverIds, copySearch)),
    [copySearch, copyTargetOptions, selectedReceiverIds]
  );
  const filteredSignerOptions = useMemo(
    () => selectableSigners.filter((user) => matchesSignerSearch(user, signerSearch)),
    [selectableSigners, signerSearch]
  );
  const selectedDocumentType = useMemo(
    () => documentTypes.find((documentType) => documentType.id === selectedDocumentTypeId) ?? null,
    [documentTypes, selectedDocumentTypeId]
  );
  const classificationSignature = useMemo(
    () =>
      JSON.stringify({
        year: selectedYear,
        emitterDirectionId,
        receivers: [...normalizedClassificationReceiverIds].sort(),
        copies: [...normalizedClassificationCopyDirectionIds].sort(),
        copyTargets: normalizedClassificationCopyTargetOptions.map((option) => option.key).sort(),
        documentTypeId: selectedDocumentTypeId
      }),
    [
      emitterDirectionId,
      normalizedClassificationCopyDirectionIds,
      normalizedClassificationCopyTargetOptions,
      normalizedClassificationReceiverIds,
      selectedDocumentTypeId,
      selectedYear
    ]
  );
  const selectedClassificationFolder = useMemo(() => {
    if (!classificationProposal?.availableFolders?.length) {
      return null;
    }

    return classificationProposal.availableFolders.find((folder) => folder.id === selectedFolderId) ?? null;
  }, [classificationProposal?.availableFolders, selectedFolderId]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingAnalysisReadiness(true);

    authorizedRequest("/api/document-intelligence/readiness", {
      method: "GET"
    })
      .then(async (response) => {
        const readiness = (await response.json()) as DocumentIntelligenceReadiness;

        if (!isMounted) {
          return;
        }

        setAnalysisReadiness(readiness);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setAnalysisReadiness({
          available: false,
          defaultMode: "auto",
          modes: {
            vision: {
              available: false,
              reason: "Verification de disponibilite impossible."
            },
            ocr: {
              available: false,
              reason: "Verification de disponibilite impossible."
            },
            auto: {
              available: false,
              reason: "Verification de disponibilite impossible."
            }
          },
          providers: {
            vision: {
              available: false,
              provider: "ollama",
              reason: "Verification de disponibilite impossible."
            },
            text: {
              available: false,
              provider: "ollama",
              reason: "Verification de disponibilite impossible."
            },
            ocr: {
              available: false,
              provider: "tesseract-cli",
              reason: "Verification de disponibilite impossible."
            }
          },
          message: "Le moteur Document Intelligence n'a pas pu etre verifie."
        });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingAnalysisReadiness(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedEmitterDirectionId && currentUser?.directionId) {
      setSelectedEmitterDirectionId(currentUser.directionId);
    }
  }, [currentUser?.directionId, selectedEmitterDirectionId]);

  function handleEmitterDirectionChange(nextDirectionId: string, source: "manual" | "analysis" | "reset" = "manual") {
    if (source === "manual") {
      setPendingAnalysisSignerIds([]);
      setTemporaryPrefilledSigners([]);
    }

    if (source === "reset") {
      setPendingAnalysisSignerIds([]);
      setTemporaryPrefilledSigners([]);
      setSelectedSignerIds([]);
    }

    setSelectedEmitterDirectionId(nextDirectionId);
  }

  useEffect(() => {
    if (!emitterDirectionId) {
      setSignerCandidates([]);
      setSignerLoadError(null);
      setIsLoadingSigners(false);
      return;
    }

    let isMounted = true;
    setIsLoadingSigners(true);
    setSignerLoadError(null);

    authorizedRequest(`${apiBaseUrl}/documents/signer-candidates?emitterDirectionId=${encodeURIComponent(emitterDirectionId)}`, {
      method: "GET"
    })
      .then(async (response) => {
        const payload = (await response.json()) as SignerCandidateApiPayload[];

        if (!isMounted) {
          return;
        }

        setSignerCandidates(payload.map(mapSignerCandidateToUser));
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setSignerCandidates([]);
        setSignerLoadError(getDisplayableErrorMessage(error));
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSigners(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, emitterDirectionId]);

  useEffect(() => {
    const allowedIds = new Set(selectableSigners.map((user) => user.id));
    setSelectedSignerIds((current) => current.filter((userId) => allowedIds.has(userId)));
  }, [selectableSigners]);

  useEffect(() => {
    if (!pendingAnalysisSignerIds.length || !selectableSigners.length) {
      return;
    }

    const allowedIds = new Set(selectableSigners.map((user) => user.id));
    const matchedIds = pendingAnalysisSignerIds.filter((userId) => allowedIds.has(userId));

    if (!matchedIds.length) {
      return;
    }

    setSelectedSignerIds((current) => uniqueIds([...current, ...matchedIds]));
    setPendingAnalysisSignerIds((current) => current.filter((userId) => !allowedIds.has(userId)));
  }, [pendingAnalysisSignerIds, selectableSigners]);

  useEffect(() => {
    const allowedDirectionIds = new Set(directionCandidates.map((direction) => direction.id));
    const allowedCopyTargetKeys = new Set(copyTargetOptions.map((option) => option.key));

    setSelectedReceiverIds((current) => {
      const sanitized = current.filter((directionId) => allowedDirectionIds.has(directionId));
      return sanitized.length === current.length ? current : sanitized;
    });

    setSelectedCopyTargetKeys((current) => {
      const sanitized = current.filter((key) => allowedCopyTargetKeys.has(key));
      return sanitized.length === current.length ? current : sanitized;
    });
  }, [copyTargetOptions, directionCandidates]);

  useEffect(() => {
    if (!isIncomingDocument || !currentUser?.directionId) {
      return;
    }

    setSelectedReceiverIds([currentUser.directionId]);
    setReceiverSearch("");
  }, [currentUser?.directionId, isIncomingDocument]);

  useEffect(() => {
    setSelectedCopyTargetKeys((current) =>
      current.filter((key) => {
        const option = copyTargetLookup.get(key);
        return option ? !selectedReceiverIds.includes(option.directionId) : false;
      })
    );
  }, [copyTargetLookup, selectedReceiverIds]);

  useEffect(() => {
    setFolderSelectionDirty(false);
  }, [classificationSignature]);

  useEffect(() => {
    if (!emitterDirectionId) {
      setClassificationProposal(null);
      setSelectedFolderId("");
      setClassificationProposalError(null);
      setIsLoadingClassificationProposal(false);
      return;
    }

    let isMounted = true;
    setIsLoadingClassificationProposal(true);
    setClassificationProposalError(null);

    authorizedRequest(`${apiBaseUrl}/documents/classification-proposal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        year: selectedYear,
        type: selectedDocumentType?.code ?? "",
        documentTypeId: selectedDocumentTypeId || undefined,
        emitterDirectionId,
        receiverDirectionIds: normalizedClassificationReceiverIds,
        copyDirectionIds: normalizedClassificationCopyDirectionIds,
        copyTargets: normalizedClassificationCopyTargetOptions.map((option) => ({
          targetKind: option.targetKind,
          targetDepartmentId: option.targetDepartmentId,
          targetUserId: option.targetUserId
        }))
      })
    })
      .then(async (response) => {
        const proposal = (await response.json()) as DocumentClassificationProposal;

        if (!isMounted) {
          return;
        }

        setClassificationProposal(proposal);
        setSelectedFolderId((current) => {
          const availableIds = new Set(proposal.availableFolders.map((folder) => folder.id));

          if (folderSelectionDirty && current && availableIds.has(current)) {
            return current;
          }

          if (current && availableIds.has(current) && !proposal.recommendedFolder) {
            return current;
          }

          return proposal.recommendedFolder?.id ?? proposal.availableFolders[0]?.id ?? "";
        });
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setClassificationProposalError(getDisplayableErrorMessage(error));
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingClassificationProposal(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, classificationSignature, folderSelectionDirty]);

  function moveSigner(userId: string, direction: "up" | "down") {
    setSelectedSignerIds((current) => {
      const index = current.indexOf(userId);

      if (index === -1) {
        return current;
      }

      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const reordered = [...current];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, moved);
      return reordered;
    });
  }

  function toggleSelection(stateSetter: Dispatch<SetStateAction<string[]>>, id: string) {
    stateSetter((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  function getFormControl(name: string) {
    return formRef.current?.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;
  }

  function setFormControlValue(name: string, value: string) {
    const control = getFormControl(name);

    if (!control || value.trim().length === 0) {
      return;
    }

    control.value = value;
  }

  function setFormControlValueIfEmpty(name: string, value: string) {
    const control = getFormControl(name);

    if (!control || value.trim().length === 0 || control.value.trim().length > 0) {
      return;
    }

    control.value = value;
  }

  function applyAnalysisResult(resultView: DocumentIntelligenceResultView) {
    const { result, matching } = resultView;
    setFormControlValueIfEmpty("numeroReference", result.reference);
    setFormControlValueIfEmpty("title", result.title);
    setFormControlValueIfEmpty("subject", result.subject);
    setFormControlValueIfEmpty("summary", result.summary);

    const matchedDocumentType = documentTypes.find((documentType) => documentType.code === result.documentType);

    if (matchedDocumentType && !selectedDocumentTypeId) {
      setSelectedDocumentTypeId(matchedDocumentType.id);
    } else if (legacyDocumentTypes.includes(result.documentType as (typeof legacyDocumentTypes)[number])) {
      setFormControlValueIfEmpty("type", result.documentType);
    }

    if (confidentialityLevels.includes(result.confidentialityLevel as (typeof confidentialityLevels)[number])) {
      setSelectedConfidentialityLevel((current) =>
        current === "INTERNE" ? (result.confidentialityLevel as (typeof confidentialityLevels)[number]) : current
      );
    }

    if (matching.emitterDirection?.status === "matched" && matching.emitterDirection.matchedDepartmentId) {
      handleEmitterDirectionChange(matching.emitterDirection.matchedDepartmentId, "analysis");
    }

    if (!isIncomingDocument) {
      const matchedReceivers = uniqueIds(
        matching.receiverDirections
          .filter((item) => item.status === "matched" && item.matchedDepartmentId)
          .map((item) => item.matchedDepartmentId as string)
      );

      if (matchedReceivers.length > 0 && selectedReceiverIds.length === 0) {
        setSelectedReceiverIds(matchedReceivers);
      }

      const matchedCopies = uniqueIds(
        matching.copyDirections
          .filter((item) => item.status === "matched" && item.matchedDepartmentId)
          .map((item) => item.matchedDepartmentId as string)
      );

      if (matchedCopies.length > 0 && selectedCopyTargetKeys.length === 0) {
        setSelectedCopyTargetKeys(
          matchedCopies
            .filter((directionId) => !matchedReceivers.includes(directionId))
            .map((directionId) => buildCopyTargetKey("DIRECTION", directionId))
        );
      }
    }

    const matchedSignerIds = uniqueIds(
      matching.signers
        .filter((item) => item.status === "matched" && item.matchedUserId)
        .map((item) => item.matchedUserId as string)
    );

    if (matchedSignerIds.length > 0) {
      setPendingAnalysisSignerIds(matchedSignerIds);
    }

    const temporarySigners = matching.signers
      .filter((item) => item.status === "matched" && item.matchedUserId)
      .map((item) => buildTemporaryPrefilledSigner(item));

    setTemporaryPrefilledSigners(temporarySigners);
  }

  async function handleAnalyzeDocument() {
    if (isAnalyzing || isLoadingAnalysisReadiness) {
      return;
    }

    const fileInput = getFormControl("file");
    const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : null;

    if (!file) {
      setAnalysisMessage("Selectionnez d'abord un fichier a analyser.");
      return;
    }

    if (!analysisReadiness?.available) {
      setAnalysisMessage(analysisReadiness?.message ?? "Le moteur Document Intelligence n'est pas encore pret.");
      return;
    }

    const payload = new FormData();
    const requestedMode = analysisReadiness?.defaultMode ?? "ocr";
    payload.append("file", file);
    payload.append("mode", requestedMode);

    setAnalysisMessage(
      `Analyse en cours (${formatAnalysisMode(requestedMode)}). Les metadonnees seront proposees a validation.`
    );
    setAnalysisSummary(null);
    setAnalysisStatus("PENDING");
    setIsAnalyzing(true);

    try {
      const response = await authorizedRequest("/api/document-intelligence/analyze", {
        method: "POST",
        body: payload
      });
      const job = (await response.json()) as DocumentIntelligenceAnalyzeResponse;
      setAnalysisJobId(job.jobId);
      setAnalysisStatus(job.status);
      await waitForAnalysisCompletion(job.jobId);
    } catch (error) {
      setAnalysisMessage(getDisplayableErrorMessage(error));
      setAnalysisStatus(null);
      setIsAnalyzing(false);
    }
  }

  async function waitForAnalysisCompletion(jobId: string) {
    const startedAt = Date.now();
    let warnedAboutLongRunningAnalysis = false;

    while (Date.now() - startedAt < ANALYSIS_HARD_WAIT_MS) {
      const statusResponse = await authorizedRequest(`/api/document-intelligence/jobs/${jobId}`, {
        method: "GET"
      });
      const job = (await statusResponse.json()) as DocumentIntelligenceJobStatusView;
      setAnalysisStatus(job.status);

      if (job.status === "COMPLETED" || job.status === "LOW_CONFIDENCE") {
        const resultView = await fetchAnalysisResultWithRetry(jobId);
        applyAnalysisResult(resultView);
        setAnalysisSummary({
          confidenceScore: resultView.job.confidenceScore ?? null,
          confidentialityLevel: resultView.result.confidentialityLevel,
          copyDirections: resultView.result.copyDirections,
          documentDate: resultView.result.documentDate,
          documentType: resultView.result.documentType,
          effectiveMode: resultView.job.effectiveMode ?? null,
          emitterDirection: resultView.result.emitterDirection,
          matching: resultView.matching,
          reference: resultView.result.reference,
          receiverDirections: resultView.result.receiverDirections,
          signers: resultView.result.signers,
          title: resultView.result.title,
          subject: resultView.result.subject
        });
        setAnalysisMessage(
          job.status === "LOW_CONFIDENCE"
            ? "Analyse terminee avec confiance faible. Les champs ont ete proposes et doivent etre verifies."
            : "Analyse terminee. Les champs reconnus ont ete proposes dans le formulaire."
        );
        setIsAnalyzing(false);
        return;
      }

      if (job.status === "FAILED") {
        setAnalysisMessage(job.errorMessage ?? "L'analyse documentaire a echoue.");
        setIsAnalyzing(false);
        return;
      }

      const elapsedMs = Date.now() - startedAt;

      if (elapsedMs >= ANALYSIS_SOFT_WAIT_MS) {
        warnedAboutLongRunningAnalysis = true;
        setAnalysisMessage(
          `Analyse toujours en cours (${formatAnalysisStatus(job.status)}). Le traitement prend plus de temps que prevu, mais le suivi continue automatiquement.`
        );
      } else {
        setAnalysisMessage(`Analyse en cours (${formatAnalysisStatus(job.status)}). Les metadonnees seront proposees a validation.`);
      }

      await sleep(ANALYSIS_POLL_INTERVAL_MS);
    }

    setAnalysisMessage(
      warnedAboutLongRunningAnalysis
        ? "L'analyse n'a pas abouti dans le delai maximal de suivi. Le traitement doit etre relance ou verifie cote serveur."
        : "L'analyse n'a pas abouti dans le delai maximal de suivi."
    );
    setIsAnalyzing(false);
  }

  async function fetchAnalysisResultWithRetry(jobId: string) {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= ANALYSIS_RESULT_MAX_ATTEMPTS; attempt += 1) {
      try {
        const resultResponse = await authorizedRequest(`/api/document-intelligence/results/${jobId}`, {
          method: "GET"
        });
        return (await resultResponse.json()) as DocumentIntelligenceResultView;
      } catch (error) {
        lastError = error;

        if (attempt === ANALYSIS_RESULT_MAX_ATTEMPTS) {
          break;
        }

        await sleep(ANALYSIS_RESULT_RETRY_MS);
      }
    }

    throw lastError;
  }

  function resetDocumentForm() {
    formRef.current?.reset();
    setSelectedYear(currentYear);
    setSelectedFileName("");
    setSelectedSignerIds([]);
    setPendingAnalysisSignerIds([]);
    setSelectedReceiverIds([]);
    setSelectedCopyTargetKeys([]);
    setReceiverSearch("");
    setCopySearch("");
    setSignerSearch("");
    setSelectedConfidentialityLevel("INTERNE");
    setSelectedDocumentTypeId("");
    setErrorMessage(null);
    setCreatedDocument(null);
    handleEmitterDirectionChange(currentUser?.directionId ?? "", "reset");
    setAnalysisJobId(null);
    setAnalysisStatus(null);
    setAnalysisMessage(null);
    setAnalysisSummary(null);
    setIsAnalyzing(false);
    setClassificationProposal(null);
    setSelectedFolderId("");
    setClassificationProposalError(null);
    setFolderSelectionDirty(false);
  }

  const analysisDisabledReason = !analysisReadiness?.available ? analysisReadiness?.message ?? null : null;

  async function handleSubmit(formData: FormData) {
    const normalizedReceivers = uniqueIds(effectiveReceiverIds).filter((directionId) => directionId !== emitterDirectionId);
    const normalizedCopyTargets = selectedCopyTargetOptions.filter(
      (option) => option.directionId !== emitterDirectionId && !normalizedReceivers.includes(option.directionId)
    );
    const normalizedCopies = uniqueIds(normalizedCopyTargets.map((option) => option.directionId));

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Le fichier est obligatoire.");
    }

    if (!normalizedReceivers.length) {
      throw new Error("Selectionnez au moins une direction destinataire differente de la direction emettrice.");
    }

    const payload = new FormData();
    payload.append("file", file);
    payload.append("numeroReference", String(formData.get("numeroReference") ?? ""));
    payload.append("year", String(selectedYear));
    payload.append("title", String(formData.get("title") ?? ""));
    payload.append("subject", String(formData.get("subject") ?? ""));
    payload.append("summary", String(formData.get("summary") ?? ""));
    payload.append("type", selectedDocumentType?.code ?? String(formData.get("type") ?? ""));

    if (selectedDocumentTypeId) {
      payload.append("documentTypeId", selectedDocumentTypeId);
    }

    if (classificationProposal?.canOverride && selectedFolderId) {
      payload.append("folderId", selectedFolderId);
    }

    payload.append(
      "signers",
      JSON.stringify(
        selectedSignerIds
          .map((userId, index) => {
            const signer = selectableSigners.find((user) => user.id === userId);

            if (!signer) {
              return null;
            }

            return {
              userId: signer.id,
              signingOrder: index + 1
            };
          })
          .filter(Boolean)
      )
    );

    if (emitterDirectionId) {
      payload.append("emitterDirectionId", emitterDirectionId);
    }

    payload.append("receiverDirectionIds", JSON.stringify(normalizedReceivers));
    payload.append("copyDirectionIds", JSON.stringify(normalizedCopies));
    payload.append(
      "copyTargets",
      JSON.stringify(
        normalizedCopyTargets.map((option) => ({
          targetKind: option.targetKind,
          targetDepartmentId: option.targetDepartmentId,
          targetUserId: option.targetUserId
        }))
      )
    );

    const createResponse = await authorizedRequest(`${apiBaseUrl}/documents`, {
      method: "POST",
      body: payload
    });

    const document = (await createResponse.json()) as {
      createdAt?: string;
      id: string;
      reference?: string;
      numeroReference?: string;
      subject?: string;
      title?: string;
    };
    setErrorMessage(null);
    setCreatedDocument({
      id: document.id,
      reference: document.reference ?? document.numeroReference ?? String(formData.get("numeroReference") ?? ""),
      title: document.title ?? document.subject ?? String(formData.get("subject") ?? "Document"),
      createdAt: document.createdAt
    });
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await handleSubmit(new FormData(event.currentTarget));
    } catch (error) {
      setCreatedDocument(null);
      setErrorMessage(getDisplayableErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleFormSubmit}
      className="space-y-4"
    >
      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Saisie documentaire
              </span>
              <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                Annee {currentYear}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-brand-navy">Saisie documentaire</h2>
              <p className="text-sm text-slate-600">Metadonnees, signataires et fichier source dans un meme parcours.</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[480px]">
            <SummaryTile
              label="Emetteur"
              value={selectedEmitterDirection ? selectedEmitterDirection.designation : "A definir"}
              icon={Building2}
            />
            <SummaryTile label="Destinataires" value={String(effectiveReceiverIds.length)} icon={Users} />
            <SummaryTile label="Signataires" value={String(selectedSignerIds.length)} icon={UserSquare2} />
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900">
            {errorMessage}
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(420px,0.95fr)]">
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <SectionHeader icon={FileText} title="Informations generales" />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FieldShell label="Reference" required className="xl:col-span-2">
                <input name="numeroReference" className={inputClassName} placeholder="Ex. DF/2026/0142" required />
              </FieldShell>
              <FieldShell label="Type" required>
                <input type="hidden" name="type" value={selectedDocumentType?.code ?? ""} />
                <select
                  name="documentTypeId"
                  className={inputClassName}
                  required
                  value={selectedDocumentTypeId}
                  onChange={(event) => setSelectedDocumentTypeId(event.target.value)}
                >
                  <option value="" disabled>
                    Selectionner
                  </option>
                  {documentTypes.map((documentType) => (
                    <option key={documentType.id} value={documentType.id}>
                      {documentType.label}
                    </option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell label="Annee" required>
                <input
                  name="year"
                  type="number"
                  value={selectedYear}
                  min={2000}
                  max={3000}
                  className={inputClassName}
                  onChange={(event) => setSelectedYear(Number.parseInt(event.target.value, 10) || currentYear)}
                  required
                />
              </FieldShell>
              <FieldShell label="Objet" className="md:col-span-2 xl:col-span-4">
                <input name="subject" className={inputClassName} placeholder="Objet du document" />
              </FieldShell>
              <FieldShell label="Titre" className="md:col-span-2 xl:col-span-4">
                <input name="title" className={inputClassName} placeholder="Intitule court" />
              </FieldShell>
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader icon={Shield} title="Sensibilite" />
            <input type="hidden" name="confidentialityLevel" value={selectedConfidentialityLevel} />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {confidentialityLevels.map((level) => {
                const active = selectedConfidentialityLevel === level;

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedConfidentialityLevel(level)}
                    className={cn(
                      "rounded-md border px-3 py-2.5 text-left transition",
                      active
                        ? `${confidentialityToneMap[level]} shadow-sm`
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em]">Niveau</span>
                    <span className="mt-1 block text-sm font-semibold">{formatConfidentiality(level)}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader icon={Building2} title="Directions concernees" />
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1.1fr]">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Emetteur</p>
                <select
                  name="emitterDirectionId"
                  value={selectedEmitterDirectionId}
                  onChange={(event) => handleEmitterDirectionChange(event.target.value, "manual")}
                  className={cn(inputClassName, "mt-2")}
                  required
                >
                  <option value="" disabled>
                    Selectionner
                  </option>
                  {selectableDirections.map((direction) => (
                    <option key={direction.id} value={direction.id}>
                      {formatStructureLabel(direction.code, direction.designation)}
                    </option>
                  ))}
                </select>
                {signerSourceLabel ? (
                  <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-900">Source signataires:</span> {signerSourceLabel}
                  </div>
                ) : null}
                {isIncomingDocument && currentDirection ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Document entrant: la direction destinataire est verrouillee sur{" "}
                    {formatStructureLabel(currentDirection.code, currentDirection.designation)}.
                  </div>
                ) : null}
              </div>

              <DirectionSelectionField
                label="Destinataires"
                searchValue={receiverSearch}
                onSearchChange={setReceiverSearch}
                selectedIds={effectiveReceiverIds}
                onSelect={(id) => toggleSelection(setSelectedReceiverIds, id)}
                onRemove={(id) => setSelectedReceiverIds((current) => current.filter((value) => value !== id))}
                options={filteredReceiverOptions}
                directionLookup={directionLookup}
                emptyState={isIncomingDocument ? "La direction destinataire est fixee par votre perimetre." : "Aucune direction disponible."}
                readOnly={isIncomingDocument}
                helperText={
                  isIncomingDocument
                    ? "Le document est encode comme document recu. La destination reste votre direction."
                    : undefined
                }
              />

              <CopyTargetSelectionField
                label="Copies"
                searchValue={copySearch}
                onSearchChange={setCopySearch}
                selectedKeys={selectedCopyTargetKeys}
                onSelect={(key) => toggleSelection(setSelectedCopyTargetKeys, key)}
                onRemove={(key) => setSelectedCopyTargetKeys((current) => current.filter((value) => value !== key))}
                options={filteredCopyOptions}
                optionLookup={copyTargetLookup}
                emptyState="Aucune structure ou utilisateur disponible."
                helperText="Les copies peuvent etre adressees a une direction, un service, un bureau ou un agent."
              />
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader icon={Building2} title="Classement recommande" />
            {classificationProposalError ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {classificationProposalError}
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Section</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {classificationProposal?.section ?? (isLoadingClassificationProposal ? "Analyse..." : "A definir")}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Type de classeur</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {classificationProposal?.recommendedFolder?.folderType ??
                    (isLoadingClassificationProposal ? "Analyse..." : "Aucune recommandation")}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 md:col-span-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Classeur recommande</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {classificationProposal?.recommendedFolder
                    ? formatClassificationFolderOption(classificationProposal.recommendedFolder)
                    : isLoadingClassificationProposal
                      ? "Chargement de la recommandation..."
                      : "Le classeur sera propose selon les informations deja saisies."}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Statut</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {isLoadingClassificationProposal
                    ? "Calcul en cours"
                    : classificationProposal?.canOverride
                      ? "Modifiable"
                      : "Automatique"}
                </p>
              </div>
            </div>
            <FieldShell label="Classeur propose">
              <select
                name="folderId"
                className={inputClassName}
                value={selectedFolderId}
                onChange={(event) => {
                  setSelectedFolderId(event.target.value);
                  setFolderSelectionDirty(true);
                }}
                disabled={!classificationProposal?.availableFolders?.length || isLoadingClassificationProposal || !classificationProposal?.canOverride}
              >
                {!classificationProposal?.availableFolders?.length ? (
                  <option value="">
                    {isLoadingClassificationProposal ? "Chargement..." : "Aucun classeur disponible"}
                  </option>
                ) : null}
                {classificationProposal?.availableFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {formatClassificationFolderOption(folder)}
                  </option>
                ))}
              </select>
            </FieldShell>
            {selectedClassificationFolder ? (
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                <span className="font-medium text-slate-900">Classeur actuellement retenu :</span>{" "}
                {formatClassificationFolderOption(selectedClassificationFolder)}
              </div>
            ) : null}
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {classificationProposal?.recommendedReason ??
                "Le moteur proposera ici un classeur compatible avec votre bureau et vos regles de classement."}
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader icon={UserSquare2} title="Signataires" />
            {signerLoadError ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {signerLoadError}
              </div>
            ) : null}
            <SignerSelectionField
              users={filteredSignerOptions}
              selectedIds={selectedSignerIds}
              onToggle={(id) => toggleSelection(setSelectedSignerIds, id)}
              onRemove={(id) => setSelectedSignerIds((current) => current.filter((value) => value !== id))}
              onMove={moveSigner}
              searchValue={signerSearch}
              onSearchChange={setSignerSearch}
              userLookup={signerLookup}
              emptyState={
                isLoadingSigners
                  ? "Chargement des signataires..."
                  : "Aucun signataire disponible pour cette direction."
              }
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <SectionHeader icon={FileText} title="Contenu" />
            <div className="space-y-3">
              <FieldShell label="Resume">
                <textarea name="summary" className={textareaClassName} placeholder="Synthese pour l'enregistrement rapide" />
              </FieldShell>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Resume conserve a la creation. Enrichissements metier dans une passe dediee.
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader icon={Paperclip} title="Numerisation" />
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Fichier source</p>
                  <p className="text-xs text-slate-500">PDF et images.</p>
                </div>
                {selectedFileName ? (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
                    Pret
                  </span>
                ) : null}
              </div>
              <input
                name="file"
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp,image/tiff"
                onChange={(event) => {
                  setSelectedFileName(event.target.files?.[0]?.name ?? "");
                  setAnalysisJobId(null);
                  setAnalysisStatus(null);
                  setAnalysisMessage(null);
                  setAnalysisSummary(null);
                  setIsAnalyzing(false);
                }}
                className="mt-3 block w-full rounded-md border border-slate-300 bg-white p-3 text-sm"
              />
              {selectedFileName ? <p className="mt-2 text-xs text-slate-700">{selectedFileName}</p> : null}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAnalyzeDocument}
                  disabled={!selectedFileName || isAnalyzing || isLoadingAnalysisReadiness || !analysisReadiness?.available}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAnalyzing || isLoadingAnalysisReadiness ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <BrainCircuit className="h-4 w-4" />
                  )}
                  {isAnalyzing
                    ? "Analyse en cours..."
                    : isLoadingAnalysisReadiness
                      ? "Verification du moteur..."
                      : "Analyser et pre-remplir"}
                </button>
                {analysisStatus ? (
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600">
                    {formatAnalysisStatus(analysisStatus)}
                  </span>
                ) : null}
              </div>
              {analysisDisabledReason ? (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {analysisDisabledReason}
                </div>
              ) : null}
              {analysisMessage ? (
                <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  {analysisMessage}
                </div>
              ) : null}
              {analysisSummary ? (
                <div className="mt-3 grid gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950 md:grid-cols-2">
                  <div>
                    <span className="font-semibold">Mode</span>: {formatAnalysisMode(analysisSummary.effectiveMode)}
                  </div>
                  <div>
                    <span className="font-semibold">Confiance</span>: {formatConfidence(analysisSummary.confidenceScore)}
                  </div>
                  <div>
                    <span className="font-semibold">Date</span>: {analysisSummary.documentDate || "Non detectee"}
                  </div>
                  <div>
                    <span className="font-semibold">Type</span>: {analysisSummary.documentType || "Non detecte"}
                  </div>
                    <div className="md:col-span-2">
                      <span className="font-semibold">Reference</span>: {analysisSummary.reference || "Non detectee"}
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-semibold">Titre</span>: {analysisSummary.title || "Non detecte"}
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-semibold">Emetteur</span>: {analysisSummary.emitterDirection || "Non detecte"}
                    </div>
                  <div className="md:col-span-2">
                    <span className="font-semibold">Destinataires</span>:{" "}
                    {formatListForAnalysis(analysisSummary.receiverDirections)}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-semibold">Copies</span>:{" "}
                    {formatListForAnalysis(analysisSummary.copyDirections)}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-semibold">Signataires</span>:{" "}
                    {formatListForAnalysis(analysisSummary.signers)}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-semibold">Confidentialite</span>:{" "}
                    {analysisSummary.confidentialityLevel
                      ? formatConfidentialityLabel(analysisSummary.confidentialityLevel)
                      : "Non detectee"}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-semibold">Objet</span>: {analysisSummary.subject || "Non detecte"}
                  </div>
                  <div className="md:col-span-2 rounded-md border border-emerald-300/70 bg-white/70 p-2 text-[11px] text-emerald-950">
                    <p className="font-semibold uppercase tracking-[0.12em] text-emerald-900">Rapprochement metier</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                      <div>
                        <span className="font-semibold">Emetteur</span>:{" "}
                        {formatMatchingItemStatus(analysisSummary.matching.emitterDirection)}
                      </div>
                      <div>
                        <span className="font-semibold">Destinataires</span>:{" "}
                        {formatMatchingListStatus(analysisSummary.matching.receiverDirections)}
                      </div>
                      <div>
                        <span className="font-semibold">Copies</span>:{" "}
                        {formatMatchingListStatus(analysisSummary.matching.copyDirections)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <DocumentUploadStatus hasFile={Boolean(selectedFileName)} uploadMessage="OCR et metadonnees extraites automatiquement" />
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader icon={Shield} title="Controle avant validation" />
            <div className="space-y-2 text-sm text-slate-600">
              <ChecklistItem complete={Boolean(emitterDirectionId)}>Direction emettrice resolue</ChecklistItem>
              <ChecklistItem complete={effectiveReceiverIds.length > 0}>Au moins un destinataire selectionne</ChecklistItem>
              <ChecklistItem complete={selectedSignerIds.length > 0}>Au moins un signataire selectionne</ChecklistItem>
              <ChecklistItem complete={Boolean(selectedFileName)}>Fichier joint</ChecklistItem>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 w-full rounded-md bg-brand-navy px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Traitement..." : "Creer le document"}
            </button>
          </Card>
        </div>
      </div>

      {createdDocument ? (
        <SuccessDialog
          createdDocument={createdDocument}
          onClose={() => setCreatedDocument(null)}
          onCreateAnother={resetDocumentForm}
        />
      ) : null}
    </form>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title
}: {
  icon: typeof FileText;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
    </div>
  );
}

function FieldShell({
  children,
  className,
  label,
  required
}: {
  children: ReactNode;
  className?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className={cn("space-y-1.5 text-sm text-slate-700", className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function CopyTargetSelectionField({
  emptyState,
  helperText,
  label,
  onRemove,
  onSearchChange,
  onSelect,
  options,
  optionLookup,
  readOnly,
  searchValue,
  selectedKeys
}: CopyTargetSelectionFieldProps) {
  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          {selectedKeys.length}
        </span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className={cn(inputClassName, "pl-9")}
          placeholder="Rechercher une direction, un service, un bureau ou un agent"
          disabled={readOnly}
        />
      </div>

      <div className="flex min-h-11 flex-wrap gap-2">
        {selectedKeys.length ? (
          selectedKeys.map((key) => {
            const option = optionLookup.get(key);

            if (!option) {
              return null;
            }

            return (
              <button
                key={key}
                type="button"
                onClick={() => onRemove(key)}
                disabled={readOnly}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <span>{option.label}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            );
          })
        ) : (
          <p className="text-xs text-slate-500">Aucune copie selectionnee.</p>
        )}
      </div>

      <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
        {options.length ? (
          options.map((option) => {
            const selected = selectedKeys.includes(option.key);

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onSelect(option.key)}
                disabled={readOnly}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                  selected ? "bg-brand-navy text-white" : "bg-white text-slate-700 hover:bg-slate-100",
                  readOnly ? "cursor-not-allowed opacity-70" : undefined
                )}
              >
                <span>{option.label}</span>
                {selected ? <span className="text-xs font-medium">Ajoutee</span> : null}
              </button>
            );
          })
        ) : (
          <p className="px-2 py-3 text-xs text-slate-500">{emptyState}</p>
        )}
      </div>

      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
    </div>
  );
}

function DirectionSelectionField({
  directionLookup,
  emptyState,
  helperText,
  label,
  onRemove,
  onSearchChange,
  onSelect,
  options,
  readOnly,
  searchValue,
  selectedIds
}: DirectionSelectionFieldProps) {
  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          {selectedIds.length}
        </span>
      </div>

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={label === "Destinataires" ? "receiverDirectionIds" : "copyDirectionIds"} value={id} />
      ))}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className={cn(inputClassName, "pl-9")}
          placeholder={`Rechercher une direction`}
          disabled={readOnly}
        />
      </div>

      <div className="flex min-h-11 flex-wrap gap-2">
        {selectedIds.length ? (
          selectedIds.map((id) => {
            const direction = directionLookup.get(id);

            if (!direction) {
              return null;
            }

            return (
              <button
                key={id}
                type="button"
                onClick={() => onRemove(id)}
                disabled={readOnly}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <span>{formatStructureLabel(direction.code, direction.designation)}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            );
          })
        ) : (
          <p className="text-xs text-slate-500">Aucune direction selectionnee.</p>
        )}
      </div>

      <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
        {options.length ? (
          options.map((direction) => {
            const selected = selectedIds.includes(direction.id);

            return (
              <button
                key={direction.id}
                type="button"
                onClick={() => onSelect(direction.id)}
                disabled={readOnly}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                  selected ? "bg-brand-navy text-white" : "bg-white text-slate-700 hover:bg-slate-100",
                  readOnly ? "cursor-not-allowed opacity-70" : undefined
                )}
              >
                <span>{formatStructureLabel(direction.code, direction.designation)}</span>
                {selected ? <span className="text-xs font-medium">Ajoutee</span> : null}
              </button>
            );
          })
        ) : (
          <p className="px-2 py-3 text-xs text-slate-500">{emptyState}</p>
        )}
      </div>

      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
    </div>
  );
}

function SignerSelectionField({
  emptyState,
  onMove,
  onRemove,
  onSearchChange,
  onToggle,
  searchValue,
  selectedIds,
  userLookup,
  users
}: SignerSelectionFieldProps) {
  const selectedSigners = selectedIds.map((id) => userLookup.get(id)).filter(Boolean);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className={cn(inputClassName, "pl-9")}
            placeholder="Rechercher un signataire"
          />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
          {users.length ? (
            users.map((user) => {
              const checked = selectedIds.includes(user.id);
              const label = user.displayName || `${user.personne.nom} ${user.personne.prenom}`.trim();

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onToggle(user.id)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition",
                    checked ? "bg-brand-navy text-white" : "bg-white text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className={cn("block text-xs", checked ? "text-slate-200" : "text-slate-500")}>
                      {user.profile.designation}
                    </span>
                  </span>
                  <span className="rounded-full border border-current px-2 py-0.5 text-[11px] font-medium">
                    {checked ? "Selectionne" : "Ajouter"}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-2 py-3 text-xs text-slate-500">{emptyState}</p>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-900">Ordre de signature</p>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
            {selectedIds.length}
          </span>
        </div>

        {selectedSigners.length ? (
          <div className="space-y-2">
            {selectedSigners.map((user, index) => {
              if (!user) {
                return null;
              }

              const label = user.displayName || `${user.personne.nom} ${user.personne.prenom}`.trim();

              return (
                <div key={user.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {index + 1}. {label}
                      </p>
                      <p className="text-xs text-slate-500">{user.profile.designation}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(user.id)}
                      className="rounded-full border border-rose-200 p-1 text-rose-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onMove(user.id, "up")}
                      disabled={index === 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      Monter
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(user.id, "down")}
                      disabled={index === selectedSigners.length - 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                      Descendre
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Selectionnez un ou plusieurs signataires pour definir leur ordre de visa.</p>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({
  children,
  complete
}: {
  children: ReactNode;
  complete: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
          complete ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
        )}
      >
        {complete ? "OK" : "?"}
      </span>
      <span>{children}</span>
    </div>
  );
}

function matchesDirectionSearch(direction: DepartementListItem, search: string) {
  const normalized = search.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    direction.code.toLowerCase().includes(normalized) ||
    direction.designation.toLowerCase().includes(normalized)
  );
}

function buildCopyTargetOptions(input: {
  departments: DepartementListItem[];
  directions: DepartementListItem[];
  users: User[];
  currentUserId?: string;
}) {
  const departmentOptions = input.departments
    .filter((department) =>
      department.type === "Direction Generale" ||
      department.type === "Direction" ||
      department.type === "Service" ||
      department.type === "Bureau"
    )
    .map((department) => ({
      key: buildCopyTargetKey(mapDepartmentTypeToCopyTargetKind(department.type), department.id),
      targetKind: mapDepartmentTypeToCopyTargetKind(department.type),
      targetDepartmentId: department.id,
      directionId: department.directionId ?? department.id,
      label: `${department.type} · ${formatStructureLabel(department.code, department.designation)}`,
      searchText: [department.type, department.code, department.designation].filter(Boolean).join(" ").toLowerCase()
    })) satisfies CopyTargetOption[];

  const userOptions = input.users
    .filter((user) => user.id !== input.currentUserId)
    .filter((user) => Boolean(user.directionId))
    .map((user) => {
      const displayName = user.displayName || `${user.personne.nom} ${user.personne.prenom}`.trim();
      return {
        key: buildCopyTargetKey("USER", user.id),
        targetKind: "USER" as const,
        targetUserId: user.id,
        directionId: user.directionId!,
        label: `Agent · ${displayName}${user.bureau ? ` · ${formatStructureLabel(user.bureau.code, user.bureau.designation)}` : ""}`,
        searchText: [
          "agent",
          displayName,
          user.email ?? "",
          user.matricule ?? "",
          user.bureau?.code ?? "",
          user.bureau?.designation ?? ""
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      } satisfies CopyTargetOption;
    });

  return [...departmentOptions, ...userOptions].sort((left, right) => left.label.localeCompare(right.label, "fr"));
}

function canSelectCopyTarget(option: CopyTargetOption, selectedReceiverIds: string[], search: string) {
  if (selectedReceiverIds.includes(option.directionId)) {
    return false;
  }

  const normalized = search.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return option.searchText.includes(normalized);
}

function buildCopyTargetKey(
  kind: CopyTargetOption["targetKind"],
  id: string
) {
  return `${kind}:${id}`;
}

function mapDepartmentTypeToCopyTargetKind(
  type: DepartementListItem["type"]
): CopyTargetOption["targetKind"] {
  switch (type) {
    case "Direction Generale":
      return "DIRECTION_GENERALE";
    case "Direction":
      return "DIRECTION";
    case "Service":
      return "SERVICE";
    case "Bureau":
      return "BUREAU";
  }
}

function mapSignerCandidateToUser(candidate: SignerCandidateApiPayload): User {
  return {
    id: candidate.id,
    email: candidate.email,
    role: candidate.role.code as User["role"],
    isActive: candidate.isActive ?? true,
    updatedAt: Date.now(),
    personne: {
      nom: candidate.nom,
      prenom: candidate.prenom
    },
    profile: {
      code: candidate.role.code,
      designation: candidate.role.name
    },
    matricule: candidate.matricule,
    bureau: null,
    dateCreation: Date.now(),
    dateDerniereModification: Date.now(),
    directionId: candidate.directionId ?? null,
    serviceId: candidate.serviceId ?? null,
    bureauId: candidate.bureauId ?? null,
    displayName: [candidate.nom, candidate.prenom].filter(Boolean).join(" ").trim()
  };
}

function mergeSignerCandidates(primary: User[], temporary: User[]) {
  const merged = new Map<string, User>();

  for (const signer of temporary) {
    merged.set(signer.id, signer);
  }

  for (const signer of primary) {
    merged.set(signer.id, signer);
  }

  return Array.from(merged.values());
}

function buildTemporaryPrefilledSigner(
  item: DocumentIntelligenceResultView["matching"]["signers"][number]
): User {
  const displayName = item.label.trim();
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const nom = nameParts[0] ?? displayName;
  const prenom = nameParts.slice(1).join(" ") || "A completer";

  return {
    id: item.matchedUserId ?? item.label,
    role: "AGENT",
    isActive: item.directoryStatus === "ACTIVE",
    directoryStatus: item.directoryStatus,
    updatedAt: Date.now(),
    personne: {
      nom,
      prenom
    },
    profile: {
      code: item.directoryStatus === "PENDING_COMPLETION" ? "AGENT_PROVISOIRE" : "AGENT",
      designation: item.directoryStatus === "PENDING_COMPLETION" ? "Agent provisoire detecte" : "Agent detecte"
    },
    bureau: null,
    dateCreation: Date.now(),
    dateDerniereModification: Date.now(),
    displayName
  };
}

function matchesSignerSearch(user: User, search: string) {
  const normalized = search.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const fullName = user.displayName || `${user.personne.nom} ${user.personne.prenom}`.trim();

  return (
    fullName.toLowerCase().includes(normalized) ||
    user.profile.designation.toLowerCase().includes(normalized) ||
    (user.email ?? "").toLowerCase().includes(normalized)
  );
}

function formatClassificationFolderOption(folder: ClassificationFolderOption) {
  if (folder.folderType === "CORRESPONDANCE") {
    return folder.displayLabel;
  }

  return folder.label ?? folder.description ?? folder.displayLabel;
}

function formatConfidentiality(level: (typeof confidentialityLevels)[number]) {
  return level.replace(/_/g, " ");
}

function SuccessDialog({
  createdDocument,
  onClose,
  onCreateAnother
}: {
  createdDocument: CreatedDocumentSummary;
  onClose: () => void;
  onCreateAnother: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div className="w-full max-w-xl rounded-[28px] border border-[color:var(--border)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">Operation confirmee</p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-navy">Document enregistre avec succes</h2>
            <p className="mt-2 text-sm text-slate-600">Le document et son classement initial ont ete confirmes.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 rounded-md border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reference</dt>
              <dd className="mt-1 text-sm font-semibold text-brand-navy">{createdDocument.reference}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Date de creation</dt>
              <dd className="mt-1 text-sm text-slate-700">{formatShortDate(createdDocument.createdAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Titre / objet</dt>
              <dd className="mt-1 text-sm text-slate-700">{createdDocument.title}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`/documents/${createdDocument.id}`}
            className="inline-flex h-9 items-center rounded-md bg-brand-navy px-4 text-sm font-medium text-white"
          >
            Consulter le document
          </a>
          <button
            type="button"
            onClick={onCreateAnother}
            className="inline-flex h-9 items-center rounded-md border border-[color:var(--border)] px-4 text-sm font-medium text-slate-700"
          >
            Creer un nouveau document
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-[color:var(--border)] px-4 text-sm font-medium text-slate-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function uniqueIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatAnalysisStatus(status: DocumentIntelligenceJobStatus) {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "UPLOADED":
      return "Fichier charge";
    case "VISION_RUNNING":
      return "Lecture vision";
    case "OCR_RUNNING":
      return "OCR local";
    case "LLM_RUNNING":
      return "Extraction IA";
    case "COMPLETED":
      return "Terminee";
    case "LOW_CONFIDENCE":
      return "A verifier";
    case "FAILED":
      return "Echec";
  }
}

function formatAnalysisMode(mode: AnalysisSummary["effectiveMode"] | "auto") {
  switch (mode) {
    case "vision":
      return "Vision locale";
    case "ocr":
      return "OCR + IA";
    case "hybrid":
      return "Hybride";
    case "auto":
      return "Automatique";
    default:
      return "Non determine";
  }
}

function formatConfidence(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  return `${Math.round(value * 100)} %`;
}

function formatListForAnalysis(values: string[]) {
  if (!values.length) {
    return "Non detecte";
  }

  return values.join(", ");
}

function formatConfidentialityLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatMatchingItemStatus(item: DocumentIntelligenceResultView["matching"]["emitterDirection"]) {
  if (!item) {
    return "Non rapproche";
  }

  return formatMatchingStatus(item.status);
}

function formatMatchingListStatus(items: DocumentIntelligenceResultView["matching"]["receiverDirections"]) {
  if (!items.length) {
    return "Aucun";
  }

  const statuses = Array.from(new Set(items.map((item) => formatMatchingStatus(item.status))));
  return statuses.join(", ");
}

function formatMatchingStatus(status: DocumentIntelligenceResultView["matching"]["receiverDirections"][number]["status"]) {
  switch (status) {
    case "matched":
      return "Reconnu";
    case "ambiguous":
      return "Ambigu";
    case "unmatched":
      return "Non reconnu";
  }
}

function sleep(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

const inputClassName =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500";

const textareaClassName =
  "min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500";

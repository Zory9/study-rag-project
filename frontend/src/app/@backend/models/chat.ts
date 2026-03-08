export interface ChatSessionDTO {
  id: number;
  title: string;
  dateCreated: string;
}

export interface MessageSourceDTO {
  fileName: string;
  page?: number;
  lineFrom?: number;
  lineTo?: number;
  snippet?: string;
}

export interface ChatMessageDTO {
  role: number; // 1 = User, 2 = Assistant
  content: string;
  dateCreated: string;
  sources: MessageSourceDTO[];
}

export interface StudyDocumentDTO {
  id: number;
  fileName: string;
  fileSummary?: string;
  dateCreated: string;
}

export interface ChatSessionDetailDTO {
  id: number;
  title: string;
  messages: ChatMessageDTO[];
  attachedDocuments: StudyDocumentDTO[];
}

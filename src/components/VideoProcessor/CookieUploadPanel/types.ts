export type CookieUploadPanelProps = {
  adminToken: string;
  uploadMessage: string;
  uploadError: string;
  uploadLoading: boolean;
  onAdminTokenChange: (value: string) => void;
  onCookieFileChange: (file: File | null) => void;
  onUpload: () => Promise<void>;
};

export interface LoginRequest {
  username: string;
  password: string;
  client: string;
}

export interface UserProfile {
  username: string;
  displayName?: string;
  role?: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface TaskRecord {
  title: string;
  description?: string;
  owner?: string;
  priority?: string;
  status: string;
}

export interface VisibleTask extends TaskRecord {
  label: string;
}

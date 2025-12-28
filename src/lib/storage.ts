import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firestore";

// Utiliser l'app Firebase déjà initialisée dans firestore.ts
const storage = getStorage(app);

export interface UploadResult {
  filename: string;
  url: string;
  filePath: string;
  mimeType: string;
  size: number;
}

/**
 * Upload un fichier vers Firebase Storage
 */
export async function uploadToStorage(
  file: File,
  projectId: string,
  stage: string
): Promise<UploadResult> {
  // Générer un nom unique
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const ext = file.name.split('.').pop() || '';
  const uniqueName = `${timestamp}-${randomStr}.${ext}`;
  
  // Chemin dans Storage: documents/{projectId}/{stage}/{filename}
  const filePath = `documents/${projectId}/${stage}/${uniqueName}`;
  const storageRef = ref(storage, filePath);

  // Upload
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      projectId,
      stage,
    },
  });

  // Récupérer l'URL publique
  const url = await getDownloadURL(snapshot.ref);

  return {
    filename: file.name,
    url,
    filePath,
    mimeType: file.type,
    size: file.size,
  };
}

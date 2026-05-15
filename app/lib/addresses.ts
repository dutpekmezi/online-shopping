import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { db } from "~/lib/firebase.client";

export type CustomerAddress = {
  id: string;
  country: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  stateOrProvince: string;
  phone: string;
  isDefault: boolean;
  createdAt?: Timestamp | Date | string | number | null;
  updatedAt?: Timestamp | Date | string | number | null;
};

export type CustomerAddressInput = Omit<CustomerAddress, "id" | "createdAt" | "updatedAt">;

const EMPTY_ADDRESS: CustomerAddressInput = {
  country: "US",
  firstName: "",
  lastName: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  stateOrProvince: "",
  phone: "",
  isDefault: false,
};

type FirebaseLikeError = {
  code?: unknown;
  message?: unknown;
};

function getAddressCollectionPath(uid: string) {
  return `users/${uid}/addresses`;
}

function getAddressDocumentPath(uid: string, addressId: string) {
  return `users/${uid}/addresses/${addressId}`;
}

function getTimestampMillis(value: CustomerAddress["updatedAt"]) {
  if (!value) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Date.parse(value) || 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  return 0;
}

function logAddressFirestoreError(action: string, error: unknown, attemptedPath: string, uid: string) {
  const firebaseError = error as FirebaseLikeError;

  console.error(`${action} failed.`, {
    firebaseErrorCode: typeof firebaseError.code === "string" ? firebaseError.code : undefined,
    firebaseErrorMessage: typeof firebaseError.message === "string" ? firebaseError.message : undefined,
    attemptedPath,
    currentUserUid: uid,
  });
}

export function getEmptyAddressInput(): CustomerAddressInput {
  return { ...EMPTY_ADDRESS };
}

export function getUserAddressesCollection(uid: string) {
  return collection(db, "users", uid, "addresses");
}

export async function fetchCustomerAddresses(uid: string) {
  const attemptedPath = getAddressCollectionPath(uid);

  try {
    const snapshot = await getDocs(collection(db, "users", uid, "addresses"));

    return snapshot.docs
      .map((addressDocument) => ({
        ...getEmptyAddressInput(),
        ...(addressDocument.data() as Omit<CustomerAddress, "id">),
        id: addressDocument.id,
      }))
      .sort((firstAddress, secondAddress) => {
        if (firstAddress.isDefault !== secondAddress.isDefault) {
          return firstAddress.isDefault ? -1 : 1;
        }

        return getTimestampMillis(secondAddress.updatedAt) - getTimestampMillis(firstAddress.updatedAt);
      });
  } catch (error) {
    logAddressFirestoreError("Address read", error, attemptedPath, uid);
    throw error;
  }
}

export async function saveCustomerAddress(uid: string, address: CustomerAddressInput, addressId?: string) {
  const addressesRef = collection(db, "users", uid, "addresses");
  const attemptedPath = addressId ? getAddressDocumentPath(uid, addressId) : getAddressCollectionPath(uid);

  try {
    if (addressId) {
      const batch = writeBatch(db);

      if (address.isDefault) {
        const existingAddresses = await getDocs(addressesRef);
        existingAddresses.docs.forEach((addressDocument) => {
          if (addressDocument.id !== addressId) {
            batch.update(addressDocument.ref, { isDefault: false, updatedAt: serverTimestamp() });
          }
        });
      }

      batch.update(doc(db, "users", uid, "addresses", addressId), {
        ...address,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return addressId;
    }

    const existingAddresses = await getDocs(addressesRef);
    const shouldUseAsDefault = address.isDefault || existingAddresses.empty;
    const newAddressRef = await addDoc(collection(db, "users", uid, "addresses"), {
      ...address,
      isDefault: shouldUseAsDefault,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (shouldUseAsDefault && !existingAddresses.empty) {
      const batch = writeBatch(db);

      existingAddresses.docs.forEach((addressDocument) => {
        batch.update(addressDocument.ref, { isDefault: false, updatedAt: serverTimestamp() });
      });
      await batch.commit();
    }

    return newAddressRef.id;
  } catch (error) {
    logAddressFirestoreError("Address save", error, attemptedPath, uid);
    throw error;
  }
}

export async function deleteCustomerAddress(uid: string, addressId: string) {
  const attemptedPath = getAddressDocumentPath(uid, addressId);

  try {
    await deleteDoc(doc(db, "users", uid, "addresses", addressId));
  } catch (error) {
    logAddressFirestoreError("Address delete", error, attemptedPath, uid);
    throw error;
  }
}

export async function setDefaultCustomerAddress(uid: string, addressId: string) {
  const attemptedPath = getAddressDocumentPath(uid, addressId);

  try {
    const addresses = await getDocs(collection(db, "users", uid, "addresses"));
    const batch = writeBatch(db);

    addresses.docs.forEach((addressDocument) => {
      batch.update(addressDocument.ref, {
        isDefault: addressDocument.id === addressId,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  } catch (error) {
    logAddressFirestoreError("Default address update", error, attemptedPath, uid);
    throw error;
  }
}

export async function updateCustomerProfileName(uid: string, displayName: string) {
  await updateDoc(doc(db, "users", uid), {
    displayName,
    updatedAt: serverTimestamp(),
  });
}

export function formatCustomerAddress(address: Pick<CustomerAddress, "firstName" | "lastName" | "addressLine1" | "addressLine2" | "city" | "stateOrProvince" | "postalCode" | "country" | "phone">) {
  const name = [address.firstName, address.lastName].filter(Boolean).join(" ");
  const cityLine = [address.city, address.stateOrProvince, address.postalCode].filter(Boolean).join(", ");

  return [name, address.addressLine1, address.addressLine2, cityLine, address.country, address.phone].filter(Boolean).join("\n");
}

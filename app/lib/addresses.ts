import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
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

export function getEmptyAddressInput(): CustomerAddressInput {
  return { ...EMPTY_ADDRESS };
}

export function getUserAddressesCollection(uid: string) {
  return collection(db, "users", uid, "addresses");
}

export async function fetchCustomerAddresses(uid: string) {
  const snapshot = await getDocs(query(getUserAddressesCollection(uid), orderBy("isDefault", "desc"), orderBy("updatedAt", "desc")));

  return snapshot.docs.map((addressDocument) => ({
    ...getEmptyAddressInput(),
    ...(addressDocument.data() as Omit<CustomerAddress, "id">),
    id: addressDocument.id,
  }));
}

export async function saveCustomerAddress(uid: string, address: CustomerAddressInput, addressId?: string) {
  const batch = writeBatch(db);
  const addressesRef = getUserAddressesCollection(uid);

  if (address.isDefault) {
    const existingAddresses = await getDocs(addressesRef);
    existingAddresses.docs.forEach((addressDocument) => {
      if (addressDocument.id !== addressId) {
        batch.update(addressDocument.ref, { isDefault: false, updatedAt: serverTimestamp() });
      }
    });
  }

  if (addressId) {
    batch.update(doc(db, "users", uid, "addresses", addressId), {
      ...address,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return addressId;
  }

  if (!address.isDefault) {
    const existingAddresses = await getDocs(addressesRef);
    if (existingAddresses.empty) {
      address = { ...address, isDefault: true };
    }
  }

  const newAddressRef = await addDoc(addressesRef, {
    ...address,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  return newAddressRef.id;
}

export async function deleteCustomerAddress(uid: string, addressId: string) {
  await deleteDoc(doc(db, "users", uid, "addresses", addressId));
}

export async function setDefaultCustomerAddress(uid: string, addressId: string) {
  const addresses = await getDocs(getUserAddressesCollection(uid));
  const batch = writeBatch(db);

  addresses.docs.forEach((addressDocument) => {
    batch.update(addressDocument.ref, {
      isDefault: addressDocument.id === addressId,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
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

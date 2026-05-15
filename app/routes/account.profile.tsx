import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { updateProfile } from "firebase/auth";
import type { Route } from "./+types/account.profile";
import { AuthGuard } from "~/components/auth/AuthGuard";
import { NavBar } from "~/components/NavBar/NavBar";
import navBarStylesHref from "~/components/NavBar/NavBar.css?url";
import accountStylesHref from "./account.css?url";
import { useAuth } from "~/hooks/useAuth";
import {
  deleteCustomerAddress,
  fetchCustomerAddresses,
  formatCustomerAddress,
  getEmptyAddressInput,
  saveCustomerAddress,
  setDefaultCustomerAddress,
  updateCustomerProfileName,
  type CustomerAddress,
  type CustomerAddressInput,
} from "~/lib/addresses";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: navBarStylesHref },
  { rel: "stylesheet", href: accountStylesHref },
];

export default function AccountProfilePage() {
  return (
    <AuthGuard>
      <AccountProfileContent />
    </AuthGuard>
  );
}

function AccountTabs() {
  return (
    <nav className="account-tabs" aria-label="Account sections">
      <NavLink to="/account/orders" className={({ isActive }) => `account-tab${isActive ? " account-tab--active" : ""}`}>
        Siparişler
      </NavLink>
      <NavLink to="/account/profile" className={({ isActive }) => `account-tab${isActive ? " account-tab--active" : ""}`}>
        Profil
      </NavLink>
    </nav>
  );
}

function AccountProfileContent() {
  const { user, loading: isAuthLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSigningOutEverywhere, setIsSigningOutEverywhere] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const defaultAddress = useMemo(() => addresses.find((address) => address.isDefault) ?? null, [addresses]);

  async function loadAddresses() {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setAddresses([]);
      setIsLoadingAddresses(false);
      return;
    }

    setIsLoadingAddresses(true);
    setErrorMessage(null);

    try {
      setAddresses(await fetchCustomerAddresses(user.uid));
    } catch (error) {
      setErrorMessage("Adresler yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsLoadingAddresses(false);
    }
  }

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, user?.uid]);

  async function saveName() {
    if (!user) {
      return;
    }

    setIsSavingName(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await updateProfile(user, { displayName: displayName.trim() || null });
      await updateCustomerProfileName(user.uid, displayName.trim());
      setStatusMessage("Profil bilgileri kaydedildi.");
    } catch (error) {
      console.error("Profile name could not be saved.", error);
      setErrorMessage("İsim kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setIsSavingName(false);
    }
  }

  async function signOutEverywhere() {
    if (!user) {
      return;
    }

    setIsSigningOutEverywhere(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/account/revoke-sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Tüm oturumlar kapatılamadı.");
      }

      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("All sessions could not be revoked.", error);
      setErrorMessage(error instanceof Error ? error.message : "Tüm cihazlardan çıkış yapılamadı.");
    } finally {
      setIsSigningOutEverywhere(false);
    }
  }

  return (
    <div className="account-page">
      <NavBar />
      <main className="account-shell">
        <header className="account-header">
          <div>
            <p className="account-kicker">Online Shopping</p>
            <h1 className="account-title">Hesabım</h1>
            <p className="account-subtitle">Siparişlerinizi ve teslimat adreslerinizi yönetin.</p>
          </div>
        </header>
        <AccountTabs />

        {statusMessage ? <p className="account-state">{statusMessage}</p> : null}
        {errorMessage ? <p className="account-state account-state--error">{errorMessage}</p> : null}

        <div className="account-grid">
          <div>
            <section className="account-card" aria-labelledby="profile-heading">
              <div className="account-card__header">
                <h2 id="profile-heading">Profil</h2>
              </div>
              <label className="account-field">
                Ad soyad
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Adınızı girin" autoComplete="name" />
              </label>
              <label className="account-field">
                E-posta
                <input value={user?.email ?? ""} readOnly aria-readonly="true" />
              </label>
              <button className="account-button" type="button" onClick={saveName} disabled={isSavingName}>
                {isSavingName ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </section>

            <section className="account-card" aria-labelledby="signout-heading">
              <div className="account-card__header">
                <h2 id="signout-heading">Oturum</h2>
              </div>
              <p className="account-muted">Bu cihazdan veya tüm cihazlardan güvenli şekilde çıkış yapabilirsiniz.</p>
              <div className="account-actions">
                <button className="account-button account-button--secondary" type="button" onClick={logout}>
                  Çıkış yap
                </button>
                <button className="account-button account-button--danger" type="button" onClick={signOutEverywhere} disabled={isSigningOutEverywhere}>
                  {isSigningOutEverywhere ? "Çıkış yapılıyor..." : "Tüm cihazlardan çıkış yap"}
                </button>
              </div>
            </section>
          </div>

          <section className="account-card" aria-labelledby="addresses-heading">
            <div className="account-card__header">
              <div>
                <h2 id="addresses-heading">Adresler</h2>
                {defaultAddress ? <p className="account-muted">Varsayılan adres: {defaultAddress.city}, {defaultAddress.country}</p> : null}
              </div>
              <button
                className="account-button"
                type="button"
                onClick={() => {
                  setEditingAddress(null);
                  setIsAddressModalOpen(true);
                }}
              >
                Ekle
              </button>
            </div>

            {isLoadingAddresses ? <div className="account-state">Adresler yükleniyor...</div> : null}
            {!isLoadingAddresses && addresses.length === 0 ? <div className="account-state">No address added.</div> : null}
            {!isLoadingAddresses && addresses.length > 0 ? (
              <div className="address-list">
                {addresses.map((address) => (
                  <article className="address-card" key={address.id}>
                    <div className="address-card__top">
                      <address>{formatCustomerAddress(address)}</address>
                      {address.isDefault ? <span className="address-badge">Varsayılan</span> : null}
                    </div>
                    <div className="address-card__actions">
                      <button className="address-link-button" type="button" onClick={() => { setEditingAddress(address); setIsAddressModalOpen(true); }}>
                        Düzenle
                      </button>
                      {!address.isDefault ? (
                        <button className="address-link-button" type="button" onClick={async () => {
                          if (!user) {
                            return;
                          }

                          await setDefaultCustomerAddress(user.uid, address.id);
                          await loadAddresses();
                        }}>
                          Varsayılan yap
                        </button>
                      ) : null}
                      <button className="address-link-button" type="button" onClick={async () => {
                        if (!user) {
                          return;
                        }

                        await deleteCustomerAddress(user.uid, address.id);
                        await loadAddresses();
                      }}>
                        Sil
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {isAddressModalOpen ? (
        <AddressModal
          address={editingAddress}
          onClose={() => setIsAddressModalOpen(false)}
          onSave={async (input) => {
            if (!user) {
              return;
            }
            await saveCustomerAddress(user.uid, input, editingAddress?.id);
            await loadAddresses();
            setIsAddressModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function AddressModal({ address, onClose, onSave }: { address: CustomerAddress | null; onClose: () => void; onSave: (input: CustomerAddressInput) => Promise<void> }) {
  const [form, setForm] = useState<CustomerAddressInput>(() => (address ? { ...address } : getEmptyAddressInput()));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateField(field: keyof CustomerAddressInput, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="account-modal-backdrop" role="presentation">
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="address-modal-heading">
        <div className="account-modal__header">
          <h2 id="address-modal-heading">{address ? "Adresi düzenle" : "Adres ekle"}</h2>
          <button className="address-link-button" type="button" onClick={onClose}>Kapat</button>
        </div>
        {errorMessage ? <p className="account-state account-state--error">{errorMessage}</p> : null}
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSaving(true);
            setErrorMessage(null);
            try {
              await onSave(form);
            } catch (error) {
              console.error("Address could not be saved.", error);
              setErrorMessage("Adres kaydedilemedi. Lütfen tekrar deneyin.");
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <div className="account-modal__grid">
            <label className="account-field">Country/region<input required value={form.country} onChange={(event) => updateField("country", event.target.value)} autoComplete="country" /></label>
            <label className="account-field">First name<input required value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} autoComplete="given-name" /></label>
            <label className="account-field">Last name<input required value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} autoComplete="family-name" /></label>
            <label className="account-field">Address line 1<input required value={form.addressLine1} onChange={(event) => updateField("addressLine1", event.target.value)} autoComplete="address-line1" /></label>
            <label className="account-field">Apartment/suite optional<input value={form.addressLine2} onChange={(event) => updateField("addressLine2", event.target.value)} autoComplete="address-line2" /></label>
            <label className="account-field">Postal code<input required value={form.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} autoComplete="postal-code" /></label>
            <label className="account-field">City<input required value={form.city} onChange={(event) => updateField("city", event.target.value)} autoComplete="address-level2" /></label>
            <label className="account-field">State/province<input value={form.stateOrProvince} onChange={(event) => updateField("stateOrProvince", event.target.value)} autoComplete="address-level1" /></label>
            <label className="account-field">Phone number<input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} autoComplete="tel" /></label>
          </div>
          <label className="account-check">
            <input type="checkbox" checked={form.isDefault} onChange={(event) => updateField("isDefault", event.target.checked)} />
            Use as default address
          </label>
          <div className="account-actions">
            <button className="account-button" type="submit" disabled={isSaving}>{isSaving ? "Kaydediliyor..." : "Kaydet"}</button>
            <button className="account-button account-button--secondary" type="button" onClick={onClose}>Vazgeç</button>
          </div>
        </form>
      </section>
    </div>
  );
}

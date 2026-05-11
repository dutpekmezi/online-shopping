import { type ReactNode, useEffect, useRef, useState, type FormEvent } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Link } from "react-router";
import { AuthStatus } from "~/components/auth/AuthStatus";
import { useAuth } from "~/hooks/useAuth";
import { db } from "~/lib/firebase.client";
import style from "./NavBar.css?url";

export function links() {
  return [{ rel: "stylesheet", href: style }];
}

const SITE_CONTENT_COLLECTION = "siteContent";
const SOCIAL_LINKS_DOCUMENT_ID = "navbarSocialLinks";
const DEFAULT_CONTACT_EMAIL = "info@example.com";
const DEFAULT_CONTACT_PHONE = "(515) 832-8733";

const topLinks = [
  { label: "Shop", to: "/shop" },
  { label: "Contact Us", to: "/contact-us" },
  { label: "Shipping Info", to: "/shipping-info" },
  { label: "Gallery", to: "/gallery" },
  { label: "About Us", to: "/about-us" },
  { label: "Compare Products", to: "/compare-products" },
  { label: "Collections", to: "/collections" },
];

type SocialNetwork = "facebook" | "instagram" | "pinterest";

type SocialLink = {
  id: SocialNetwork;
  label: string;
  defaultHref: string;
  renderIcon: () => ReactNode;
};

type SocialLinkValues = Record<SocialNetwork, string>;

type ContactLinkValues = {
  email: string;
  phone: string;
};

const socialLinks: SocialLink[] = [
  {
    id: "facebook",
    label: "Facebook",
    defaultHref: "https://facebook.com",
    renderIcon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.5 22v-8h2.7l.4-3h-3.1V9c0-.9.3-1.5 1.6-1.5h1.7V4.8c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.3v2.4H7.5v3h2.7v8h3.3Z" />
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    defaultHref: "https://instagram.com",
    renderIcon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.5 2h9C19.5 2 22 4.5 22 7.5v9c0 3-2.5 5.5-5.5 5.5h-9C4.5 22 2 19.5 2 16.5v-9C2 4.5 4.5 2 7.5 2Zm-.2 2.2A3.1 3.1 0 0 0 4.2 7.3v9.4c0 1.7 1.4 3.1 3.1 3.1h9.4c1.7 0 3.1-1.4 3.1-3.1V7.3c0-1.7-1.4-3.1-3.1-3.1H7.3ZM17.8 6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z" />
      </svg>
    ),
  },
  {
    id: "pinterest",
    label: "Pinterest",
    defaultHref: "https://pinterest.com",
    renderIcon: () => (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.1 2C6.8 2 4 5.4 4 9.2c0 2.3 1.3 5.1 3.3 6 .3.1.4 0 .5-.2l.5-1.9c.1-.2 0-.3-.2-.6-.5-.7-.9-1.9-.9-3 0-2.9 2.2-5.8 6-5.8 3.3 0 5.5 2.3 5.5 5 0 3.3-1.7 5.7-3.9 5.7-1.2 0-2-1-1.8-2.2.3-1.4.9-2.9.9-3.9 0-.9-.5-1.7-1.6-1.7-1.3 0-2.3 1.3-2.3 3.1 0 1.1.4 1.9.4 1.9l-1.4 5.8c-.4 1.7 0 4.5 0 4.8 0 .2.2.3.3.1.1-.2 1.2-1.8 1.7-3.5.1-.5.8-3.1.8-3.1.4.7 1.6 1.3 2.9 1.3 3.8 0 6.5-3.5 6.5-7.9C20 5.3 16.7 2 12.1 2Z" />
      </svg>
    ),
  },
];

const defaultSocialLinkValues = socialLinks.reduce((values, link) => {
  values[link.id] = link.defaultHref;
  return values;
}, {} as SocialLinkValues);

const defaultContactLinkValues: ContactLinkValues = {
  email: DEFAULT_CONTACT_EMAIL,
  phone: DEFAULT_CONTACT_PHONE,
};

function normalizeHref(value: string, fallback: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return fallback;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function normalizeEmailAddress(value: string, fallback = DEFAULT_CONTACT_EMAIL) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return fallback;
  }

  return trimmedValue.replace(/^mailto:/i, "");
}

function createMailToHref(emailAddress: string) {
  return `mailto:${normalizeEmailAddress(emailAddress)}`;
}

function normalizePhoneNumber(value: string, fallback = DEFAULT_CONTACT_PHONE) {
  return value.trim() || fallback;
}

function normalizeSocialLinks(value: unknown): SocialLinkValues {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return socialLinks.reduce((values, link) => {
    const rawHref = data[link.id];
    values[link.id] = typeof rawHref === "string" ? normalizeHref(rawHref, link.defaultHref) : link.defaultHref;
    return values;
  }, {} as SocialLinkValues);
}

function normalizeContactLinks(value: unknown): ContactLinkValues {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    email: typeof data.email === "string" ? normalizeEmailAddress(data.email) : defaultContactLinkValues.email,
    phone: typeof data.phone === "string" ? normalizePhoneNumber(data.phone) : defaultContactLinkValues.phone,
  };
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a href={href} aria-label={label} className="navbar__social-link" target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function NavBar() {
  const { isAdmin } = useAuth();
  const [socialLinkValues, setSocialLinkValues] = useState<SocialLinkValues>(defaultSocialLinkValues);
  const [draftSocialLinkValues, setDraftSocialLinkValues] = useState<SocialLinkValues>(defaultSocialLinkValues);
  const [contactLinkValues, setContactLinkValues] = useState<ContactLinkValues>(defaultContactLinkValues);
  const [draftContactLinkValues, setDraftContactLinkValues] = useState<ContactLinkValues>(defaultContactLinkValues);
  const [isSocialEditorOpen, setIsSocialEditorOpen] = useState(false);
  const [socialEditorMessage, setSocialEditorMessage] = useState<string | null>(null);
  const [isSavingSocialLinks, setIsSavingSocialLinks] = useState(false);
  const socialEditorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    getDoc(doc(db, SITE_CONTENT_COLLECTION, SOCIAL_LINKS_DOCUMENT_ID))
      .then((snapshot) => {
        if (!isSubscribed || !snapshot.exists()) {
          return;
        }

        const nextSocialLinkValues = normalizeSocialLinks(snapshot.data());
        const nextContactLinkValues = normalizeContactLinks(snapshot.data());
        setSocialLinkValues(nextSocialLinkValues);
        setDraftSocialLinkValues(nextSocialLinkValues);
        setContactLinkValues(nextContactLinkValues);
        setDraftContactLinkValues(nextContactLinkValues);
      })
      .catch((error) => {
        console.error("Navbar social links could not be loaded.", error);
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!socialEditorRef.current?.contains(event.target as Node)) {
        setIsSocialEditorOpen(false);
      }
    }

    if (isSocialEditorOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isSocialEditorOpen]);

  async function handleSocialLinksSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingSocialLinks(true);
    setSocialEditorMessage(null);

    const nextSocialLinkValues = socialLinks.reduce((values, link) => {
      values[link.id] = normalizeHref(draftSocialLinkValues[link.id], link.defaultHref);
      return values;
    }, {} as SocialLinkValues);
    const nextContactLinkValues: ContactLinkValues = {
      email: normalizeEmailAddress(draftContactLinkValues.email),
      phone: normalizePhoneNumber(draftContactLinkValues.phone),
    };

    try {
      await setDoc(
        doc(db, SITE_CONTENT_COLLECTION, SOCIAL_LINKS_DOCUMENT_ID),
        {
          ...nextSocialLinkValues,
          ...nextContactLinkValues,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setSocialLinkValues(nextSocialLinkValues);
      setDraftSocialLinkValues(nextSocialLinkValues);
      setContactLinkValues(nextContactLinkValues);
      setDraftContactLinkValues(nextContactLinkValues);
      setSocialEditorMessage("Sosyal medya ve iletişim bilgileri kaydedildi.");
    } catch (error) {
      console.error("Navbar social and contact links could not be saved.", error);
      setSocialEditorMessage("Linkler ve iletişim bilgileri kaydedilemedi. Admin yetkinizi kontrol edin.");
    } finally {
      setIsSavingSocialLinks(false);
    }
  }

  return (
    <header className="navbar">
      <div className="navbar__contact-row">
        <div className="navbar__contact-content">
          <div className="navbar__contact-info">
            <a className="navbar__email-link" href={createMailToHref(contactLinkValues.email)}>
              E-mail us
            </a>
            <span className="navbar__divider">|</span>
            <span>{contactLinkValues.phone}</span>
          </div>

          <div className="navbar__social-area">
            <div className="navbar__socials" aria-label="Social media">
              {socialLinks.map((socialLink) => (
                <SocialIcon href={socialLinkValues[socialLink.id]} label={socialLink.label} key={socialLink.id}>
                  {socialLink.renderIcon()}
                </SocialIcon>
              ))}
            </div>

            {isAdmin ? (
              <div className="navbar__social-editor" ref={socialEditorRef}>
                <button
                  type="button"
                  className="navbar__social-edit-button"
                  aria-label="Edit social media links"
                  aria-expanded={isSocialEditorOpen}
                  onClick={() => {
                    setDraftSocialLinkValues(socialLinkValues);
                    setDraftContactLinkValues(contactLinkValues);
                    setSocialEditorMessage(null);
                    setIsSocialEditorOpen((isOpen) => !isOpen);
                  }}
                >
                  ✎
                </button>

                {isSocialEditorOpen ? (
                  <form className="navbar__social-editor-panel" onSubmit={handleSocialLinksSubmit}>
                    <p className="navbar__social-editor-title">Social media & contact</p>
                    {socialLinks.map((socialLink) => (
                      <label className="navbar__social-input-row" key={socialLink.id}>
                        <span className="navbar__social-input-icon" aria-hidden="true">
                          {socialLink.renderIcon()}
                        </span>
                        <input
                          type="text"
                          inputMode="url"
                          value={draftSocialLinkValues[socialLink.id]}
                          aria-label={`${socialLink.label} link`}
                          placeholder={`${socialLink.label} link`}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setDraftSocialLinkValues((currentValues) => ({
                              ...currentValues,
                              [socialLink.id]: nextValue,
                            }));
                          }}
                        />
                      </label>
                    ))}

                    <label className="navbar__contact-input-row">
                      <span>E-mail gönderim adresi</span>
                      <input
                        type="email"
                        value={draftContactLinkValues.email}
                        aria-label="E-mail gönderim adresi"
                        placeholder="info@example.com"
                        onChange={(event) => {
                          setDraftContactLinkValues((currentValues) => ({
                            ...currentValues,
                            email: event.target.value,
                          }));
                        }}
                      />
                    </label>
                    <label className="navbar__contact-input-row">
                      <span>Telefon numarası</span>
                      <input
                        type="tel"
                        value={draftContactLinkValues.phone}
                        aria-label="E-mail us yanındaki telefon numarası"
                        placeholder="(515) 832-8733"
                        onChange={(event) => {
                          setDraftContactLinkValues((currentValues) => ({
                            ...currentValues,
                            phone: event.target.value,
                          }));
                        }}
                      />
                    </label>
                    <div className="navbar__social-editor-actions">
                      <button type="submit" disabled={isSavingSocialLinks}>
                        {isSavingSocialLinks ? "Saving..." : "Save"}
                      </button>
                    </div>
                    {socialEditorMessage ? <p className="navbar__social-editor-message">{socialEditorMessage}</p> : null}
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="navbar__main-row">
        <div className="navbar__brand">
          <Link to="/home" className="navbar__brand-name">
            EDACraftAtelier
          </Link>
        </div>

        <nav className="navbar__menu" aria-label="Main navigation">
          {topLinks.map((link) => (
            <Link to={link.to} key={link.to} className="navbar__menu-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="navbar__actions" aria-label="Quick actions">
          <button type="button" aria-label="Search" className="navbar__icon-button">
            🔍
          </button>
          <button type="button" aria-label="Cart" className="navbar__icon-button navbar__cart-button">
            🛒
            <span className="navbar__cart-count">0</span>
          </button>
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}

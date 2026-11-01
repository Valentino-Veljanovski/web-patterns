import { ContactForm } from "./ContactForm";

export default function ContactPage() {
  return (
    <>
      <h1>Contact</h1>
      <p className="lead">
        The form posts JSON to <code>/api/contact</code>, a route built with <code>createContactHandler</code>. The
        example transport records the Microsoft Graph payload instead of sending it, and the page shows what was
        recorded. A missing field or a bad address comes back as a 400 with the field list.
      </p>
      <ContactForm />
    </>
  );
}

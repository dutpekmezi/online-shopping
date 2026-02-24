export function ContactForm() {
  return (
    <form className="grid gap-2 max-w-md">
      <input className="border p-2" placeholder="Name" />
      <input className="border p-2" placeholder="Email" />
      <textarea className="border p-2" placeholder="Message" />
      <button type="submit" className="border p-2">Send</button>
    </form>
  );
}

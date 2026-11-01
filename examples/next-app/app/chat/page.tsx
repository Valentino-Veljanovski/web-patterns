import { ChatDemo } from "./ChatDemo";

export default function ChatPage() {
  return (
    <>
      <h1>Chat</h1>
      <p className="lead">
        The button in the corner opens the on-page assistant. It answers from a list of sources built from this
        site&apos;s content, in the browser, with no request to any endpoint. The host proof counts the network
        requests after the widget opens and expects none.
      </p>
      <section id="music">
        <h2>Music</h2>
        <p className="card">Featured songs and listening links would be listed here.</p>
      </section>
      <section id="theatre">
        <h2>Theatre</h2>
        <p className="card">Stage productions and public awards would be listed here.</p>
      </section>
      <section id="studio">
        <h2>Studio</h2>
        <p className="card">Recording and production work would be described here.</p>
      </section>
      <ChatDemo />
    </>
  );
}

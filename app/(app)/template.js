/* Re-mounts on every navigation inside the app shell, so each page fades
   in while the sidebar and header stay put. */
export default function AppTemplate({ children }) {
  return <div className="shifa-page-enter">{children}</div>;
}

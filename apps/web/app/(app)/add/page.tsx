import { AddScreen } from "@/components/add/add-screen";

/** /add opened straight (a link, a reload): the add sheet has the page to itself. From a tab it is the intercepting route. */
export default function AddPage() {
  return <AddScreen standalone />;
}

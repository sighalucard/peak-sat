import { PageHeader } from "@/components/ui";
import { DesmosTraining } from "./training";

export const metadata = { title: "Desmos training" };

export default function Page() {
  return (
    <div>
      <PageHeader title="Desmos calculator training" subtitle="The digital SAT includes the Desmos graphing calculator on every Math question. Learn when it saves time and when it doesn't." />
      <DesmosTraining />
    </div>
  );
}

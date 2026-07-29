"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AddExtraForm } from "@/components/team/AddExtraForm";
import { ExtraRow } from "@/components/team/ExtraRow";
import type { Profile } from "@/lib/types";

export function TeamList({ extras }: { extras: Profile[] }) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {showAddForm ? (
        <AddExtraForm onDone={() => setShowAddForm(false)} />
      ) : (
        <div className="flex justify-end">
          <Button onClick={() => setShowAddForm(true)}>
            Ajouter un extra
          </Button>
        </div>
      )}

      <Card>
        {extras.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Aucun extra pour le moment.
          </p>
        ) : (
          extras.map((extra) => <ExtraRow key={extra.id} extra={extra} />)
        )}
      </Card>
    </div>
  );
}

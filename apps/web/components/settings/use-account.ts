"use client";

import { useEffect, useState } from "react";
import { currentAccount, type AccountInfo } from "@/lib/auth-actions";

/** The signed-in account, read after mount (the same rule as the profile). `loaded` is false until then. */
export function useAccount(): { loaded: boolean; account: AccountInfo | null } {
  const [state, setState] = useState<{ loaded: boolean; account: AccountInfo | null }>({ loaded: false, account: null });

  useEffect(() => {
    let active = true;
    currentAccount().then((account) => {
      if (active) setState({ loaded: true, account });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

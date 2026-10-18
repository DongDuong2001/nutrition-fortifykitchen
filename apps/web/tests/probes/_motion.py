"""cc-55: wait for motion to finish before measuring. A sheet, a centred dialog or a card enters with a CSS transition
(slide, or scale 0.96 → 1), so a box measured mid-way is 4% small or still moving. settled() waits until no finite
animation or transition runs (spinners and pulses are endless and do not count), at most `timeout` ms.

Not a probe (run_all.py skips names that start with "_").
"""


def settled(pg, timeout=2000):
    pg.wait_for_function(
        """() => document.getAnimations().every(a => a.playState !== 'running'
            || !a.effect || a.effect.getComputedTiming().endTime === Infinity)""",
        timeout=timeout,
    )

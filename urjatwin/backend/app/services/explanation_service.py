"""
Explanation service — generates deterministic text explanations from actual result data.
Never inserts numerical claims that don't exist in the simulation results.
"""
from typing import List, Optional


def generate_explanation(pf_baseline, violations: List, comparison) -> str:
    """
    Generate a human-readable explanation of the simulation results.
    
    Parameters
    ----------
    pf_baseline : PowerFlowResult
        Baseline power flow result.
    violations : list of Violation
        Constraint violations found in the baseline.
    comparison : ActionComparisonResult
        Result of the corrective action evaluation.
    """
    n_candidates = len(comparison.all_candidates)
    n_violations = len(violations)
    selected = comparison.selected_candidate

    # ── No baseline violations ────────────────────────────────────────────────
    if n_violations == 0:
        if selected and selected.family == "NO_ACTION":
            return (
                f"The baseline simulation shows no constraint violations. "
                f"No corrective action is needed. "
                f"All {n_candidates} evaluated candidates were assessed; "
                f"NO_ACTION is selected as it requires zero curtailment and zero switching effort."
            )
        elif selected:
            return (
                f"The baseline shows no violations. Action '{selected.id}' ({selected.family}) "
                f"was selected as the best available option with "
                f"{selected.curtailed_mwh:.4f} MWh curtailment and "
                f"{len(selected.switching_ops)} switching operation(s)."
            )
        else:
            return "No violations found in baseline. No action required."

    # ── Describe violations ───────────────────────────────────────────────────
    viol_summary_parts = []
    for v in violations[:3]:  # summarise first 3 violations
        viol_summary_parts.append(
            f"{v.type} at {v.element_id} "
            f"({v.actual_value:.4f} {v.unit}, limit {v.limit:.4f} {v.unit})"
        )
    viol_text = "; ".join(viol_summary_parts)
    if len(violations) > 3:
        viol_text += f"; and {len(violations) - 3} more violation(s)"

    # ── Baseline PF summary ───────────────────────────────────────────────────
    if pf_baseline.converged and pf_baseline.bus_voltages_pu:
        valid_v = [v for v in pf_baseline.bus_voltages_pu.values() if v is not None]
        min_v = min(valid_v) if valid_v else None
        max_v = max(valid_v) if valid_v else None
        v_range = (
            f"Bus voltages ranged {min_v:.4f} pu to {max_v:.4f} pu. "
            if min_v is not None else ""
        )
    else:
        v_range = "Baseline power flow did not converge. "

    # ── Feasible candidate found ──────────────────────────────────────────────
    if comparison.status == "FEASIBLE" and selected:
        rejected = [c for c in comparison.all_candidates if not c.feasible]
        rejected_families = {}
        for c in rejected:
            fam = c.family
            if fam not in rejected_families:
                rejected_families[fam] = c.rejection_reason or "constraint violation"

        rejected_text = "; ".join(
            f"{fam}: {reason}" for fam, reason in rejected_families.items()
            if fam != selected.family
        )

        explanation = (
            f"Baseline detected {n_violations} violation(s): {viol_text}. "
            f"{v_range}"
            f"After evaluating {n_candidates} candidate actions, "
            f"action '{selected.id}' from the '{selected.family}' family was selected. "
            f"It resolves all violations with "
            f"{selected.curtailed_mwh:.4f} MWh curtailment, "
            f"{selected.network_losses_mw:.4f} MW network losses, "
            f"and {len(selected.switching_ops)} switching operation(s). "
        )

        if rejected_text:
            explanation += f"Rejected alternatives: {rejected_text}. "

        explanation += (
            "This is a single-time-step steady-state recommendation. "
            "Real switching requires protection coordination validation."
        )
        return explanation

    # ── No feasible candidate ────────────────────────────────────────────────
    if comparison.status == "NO_FEASIBLE_CANDIDATE":
        # Break down why each family failed
        family_reasons = {}
        for c in comparison.all_candidates:
            if not c.feasible:
                fam = c.family
                if fam not in family_reasons or c.rejection_reason:
                    family_reasons[fam] = c.rejection_reason or f"{c.num_violations} violation(s) remain"

        reason_lines = []
        for fam, reason in family_reasons.items():
            reason_lines.append(f"  • {fam}: {reason}")
        reasons_text = "\n".join(reason_lines) if reason_lines else "  (all candidates produced remaining violations)"

        return (
            f"Baseline detected {n_violations} violation(s): {viol_text}. "
            f"{v_range}"
            f"After evaluating {n_candidates} candidates across all action families, "
            f"no candidate resolved all electrical violations within the declared limits. "
            f"Rejection reasons by family:\n{reasons_text}\n"
            f"This conclusion applies to the evaluated action set only. "
            f"Wider reconfiguration options or relaxing curtailment limits may help "
            f"but were not evaluated in this run. "
            f"Status: NO_FEASIBLE_CANDIDATE (not proven globally infeasible)."
        )

    # ── Other statuses ────────────────────────────────────────────────────────
    return (
        f"Simulation completed with status '{comparison.status}'. "
        f"{n_violations} baseline violation(s). {n_candidates} candidates evaluated."
    )

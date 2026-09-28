import copy
import networkx as nx
import pandapower.topology as top
import pandapower as pp
from typing import List, Tuple

def check_radiality(net: pp.pandapowerNet) -> bool:
    try:
        mg = top.create_nxgraph(net, include_lines=True, include_trafos=True, include_switches=True)
        return nx.is_tree(mg)
    except Exception:
        return False

def check_connectivity(net: pp.pandapowerNet, required_buses: List[int]) -> bool:
    try:
        mg = top.create_nxgraph(net, include_lines=True, include_trafos=True, include_switches=True)
        if 0 not in mg.nodes:
            return False
        connected_components = list(nx.connected_components(mg))
        main_component = next((c for c in connected_components if 0 in c), set())
        return all(b in main_component for b in required_buses if b in mg.nodes)
    except Exception:
        return False

def get_valid_switching_candidates(net: pp.pandapowerNet, unavailable_switches: List[int] = None) -> List[List[Tuple[int, bool]]]:
    unavailable_switches = unavailable_switches or []
    # case33bw has 37 lines (0-36), we added 3 tie lines at indices 37, 38, 39
    # But when we check net.line, the tie lines are actually added after the original 37
    # For safety, find them by name
    tie_mask = net.line['name'].str.startswith('Tie', na=False)
    tie_indices = list(net.line[tie_mask].index)
    
    # Fallback: use last 3 lines if naming not found
    if len(tie_indices) < 3:
        all_indices = list(net.line.index)
        tie_indices = all_indices[-3:]
    
    adj_idx = [6, 7, 10]  # lines to open when tie is closed (approximate)
    
    candidates = [[]]  # no-switching base case
    
    for i in range(min(3, len(tie_indices))):
        if i not in unavailable_switches:
            # Only add candidate if the tie line exists in the network
            if i < len(tie_indices) and i < len(adj_idx):
                candidates.append([(tie_indices[i], True), (adj_idx[i], False)])
    
    valid_candidates = []
    required_buses = list(range(1, 33))
    
    for cand in candidates:
        net_copy = copy.deepcopy(net)
        for l_idx, state in cand:
            if l_idx in net_copy.line.index:
                net_copy.line.loc[l_idx, 'in_service'] = state
                
        if check_radiality(net_copy) and check_connectivity(net_copy, required_buses):
            valid_candidates.append(cand)
        else:
            # Always include empty (no-switching) candidate
            if not cand:
                valid_candidates.append(cand)
            
    return valid_candidates if valid_candidates else [[]]

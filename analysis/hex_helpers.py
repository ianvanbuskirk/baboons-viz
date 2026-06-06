# see https://www.redblobgames.com/grids/hexagons/

import numpy as np

def hex_corner(x,y, size, i,offset=0):
    angle_deg = 60 * i - 30 + offset
    angle_rad = np.pi / 180 * angle_deg
    return (x + size * np.cos(angle_rad),
            y + size * np.sin(angle_rad))

def qr_to_xy(q,r,size):
    x = size * (np.sqrt(3) * q  +  np.sqrt(3)/2 * r)
    y = size * (                           3./2 * r)
    return (x, y)

def xy_to_qr(x,y,size):
    if np.isnan(x) or np.isnan(y):
        return(np.nan,np.nan)
    q = (np.sqrt(3)/3 * x -  1./3 * y) / size
    r = (                    2./3 * y) / size
    return hex_round(q, r)

def hex_round(q,r):
    return cube_to_axial(*cube_round(*axial_to_cube(q,r)))

def axial_to_cube(q,r):
    return (q,r,-q-r)

def cube_to_axial(q,r,s):
    return (q,r)

def cube_round(q,r,s):
    qi = int(round(q))
    ri = int(round(r))
    si = int(round(s))

    q_diff = abs(qi - q)
    r_diff = abs(ri - r)
    s_diff = abs(si - s)

    if q_diff > s_diff and q_diff > r_diff:
        qi = -si-ri
    elif s_diff > r_diff:
        si = -qi-ri
    else:
        ri = -qi-si

    return (qi,ri,si)

def xy_traj_to_qr_traj(trajectory,size):
    x,y = trajectory.T

    q = (np.sqrt(3)/3 * x -  1./3 * y) / size
    r = (                    2./3 * y) / size
    s = -q - r

    qi = q.round()
    ri = r.round()
    si = s.round()

    q_diff = abs(qi - q)
    r_diff = abs(ri - r)
    s_diff = abs(si - s)

    change_qi = (q_diff > s_diff) * (q_diff > r_diff)
    change_si = ~change_qi * (s_diff > r_diff)
    change_ri = ~change_qi * ~change_si

    new_q = qi*(~change_qi)+(-si-ri)*change_qi
    new_s = si*(~change_si)+(-qi-ri)*change_si
    new_r = ri*(~change_ri)+(-qi-si)*change_ri
    
    return(np.vstack([new_q,new_r]).T)
"""Build the generic 3D models for BHARAT HF LOCATOR in Blender and export them as GLB.

Generic, non-branded designs (CLAUDE.md constraint): not copies of any real product.
  df_station.glb   - equipment shelter on a pad + circular array of 8 vertical masts (Adcock-style ring)
  transmitter.glb  - generic 4x4 utility truck with an equipment box and a tall whip antenna
Units: metres, origin at ground centre. The glTF exporter converts Blender Z-up to glTF Y-up.

Run (headless):
  "C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b --factory-startup -P research/blender/build_models.py -- web/public/models
"""
import math
import os
import sys

import bpy

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "."
os.makedirs(OUT, exist_ok=True)


def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials):
        for item in list(block):
            block.remove(item)


def mat(name, color, metal=0.0, rough=0.5, emit=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    try:
        m.use_nodes = True  # deprecated (always on) in newer Blender; harmless
    except Exception:
        pass
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    if emit is not None:
        key = "Emission Color" if "Emission Color" in p.inputs else "Emission"
        p.inputs[key].default_value = (*emit, 1)
        p.inputs["Emission Strength"].default_value = strength
    return m


def finish(obj, material, bevel=0.0, smooth=False):
    obj.data.materials.append(material)
    if bevel > 0:
        b = obj.modifiers.new("Bevel", "BEVEL")
        b.width = bevel
        b.segments = 2
        b.limit_method = "ANGLE"
    if smooth:
        bpy.ops.object.shade_smooth()
    return obj


def box(name, size, loc, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, material, bevel)


def cyl(name, r, depth, loc, material, verts=16, rot=(0, 0, 0), smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    return finish(o, material, smooth=smooth)


def sphere(name, r, loc, material, seg=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=loc)
    o = bpy.context.active_object
    o.name = name
    return finish(o, material, smooth=True)


def export(path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True)
    tris = sum(len(o.data.loop_triangles) if (o.data.calc_loop_triangles() or True) else 0
               for o in bpy.context.selected_objects if o.type == "MESH")
    print(f"exported {path} ({len(bpy.context.selected_objects)} objects, ~{tris} triangles before modifiers)")


# ---------------------------------------------------------------- DF station
clear()
concrete = mat("Concrete", (0.36, 0.38, 0.40), rough=0.9)
shelter = mat("Shelter", (0.78, 0.84, 0.88), metal=0.2, rough=0.45)
trim = mat("Trim", (0.12, 0.16, 0.2), metal=0.4, rough=0.4)
metal = mat("Mast", (0.82, 0.86, 0.9), metal=0.9, rough=0.25)
insul = mat("Insulator", (0.15, 0.17, 0.2), rough=0.6)
cyan = mat("CyanGlow", (0.2, 0.8, 1.0), emit=(0.21, 0.81, 1.0), strength=6.0)

cyl("Pad", 13.0, 0.4, (0, 0, 0.2), concrete, verts=48, smooth=False)
box("Shelter", (5.0, 3.0, 2.8), (0, 0, 1.8), shelter, bevel=0.06)
box("Roof", (5.4, 3.4, 0.18), (0, 0, 3.29), trim, bevel=0.03)
box("Door", (0.05, 1.0, 2.0), (2.53, 0.6, 1.4), trim)
box("ACUnit", (0.9, 0.6, 0.7), (-1.2, -1.85, 1.6), trim, bevel=0.04)
cyl("Beacon", 0.18, 0.35, (1.8, 1.1, 3.55), cyan, verts=12)
for i in range(8):
    a = i / 8 * 2 * math.pi
    x, y = 10.0 * math.cos(a), 10.0 * math.sin(a)
    cyl(f"MastBase{i}", 0.35, 0.5, (x, y, 0.65), insul, verts=10)
    cyl(f"Mast{i}", 0.09, 9.0, (x, y, 5.4), metal, verts=10)
    cyl(f"Arm{i}", 0.05, 1.6, (x, y, 9.4), metal, verts=8, rot=(0, math.pi / 2, a))
    sphere(f"Tip{i}", 0.2, (x, y, 9.95), cyan, seg=10)
bpy.ops.mesh.primitive_torus_add(major_radius=10.0, minor_radius=0.05, major_segments=64, minor_segments=6, location=(0, 0, 9.4))
finish(bpy.context.active_object, metal).name = "RingCable"
export(os.path.join(OUT, "df_station.glb"))

# ---------------------------------------------------------------- transmitter
clear()
body = mat("Body", (0.22, 0.25, 0.29), metal=0.3, rough=0.55)
boxm = mat("EquipBox", (0.33, 0.36, 0.40), metal=0.2, rough=0.5)
glass = mat("Glass", (0.05, 0.08, 0.12), metal=0.6, rough=0.1)
tyre = mat("Tyre", (0.04, 0.04, 0.045), rough=0.85)
rim = mat("Rim", (0.5, 0.52, 0.55), metal=0.8, rough=0.35)
whip = mat("Whip", (0.85, 0.88, 0.92), metal=0.8, rough=0.3)
purple = mat("PurpleGlow", (0.71, 0.42, 1.0), emit=(0.71, 0.42, 1.0), strength=8.0)

box("Chassis", (6.4, 2.3, 0.5), (0, 0, 1.0), body, bevel=0.05)
box("Cab", (1.9, 2.3, 1.7), (2.15, 0, 2.1), body, bevel=0.12)
box("Windscreen", (0.06, 2.0, 0.8), (3.11, 0, 2.45), glass)
for s in (-1, 1):
    box(f"SideWindow{s}", (1.0, 0.04, 0.6), (2.25, s * 1.16, 2.45), glass)
box("EquipmentBox", (3.8, 2.3, 2.2), (-1.15, 0, 2.35), boxm, bevel=0.08)
box("Generator", (0.9, 1.4, 0.8), (-3.4, 0, 1.6), body, bevel=0.05)
for x in (2.2, -1.9):
    for s in (-1, 1):
        cyl(f"Tyre{x}{s}", 0.55, 0.45, (x, s * 1.15, 0.55), tyre, verts=20, rot=(math.pi / 2, 0, 0))
        cyl(f"Rim{x}{s}", 0.3, 0.47, (x, s * 1.15, 0.55), rim, verts=12, rot=(math.pi / 2, 0, 0))
cyl("WhipMount", 0.16, 0.3, (-2.2, 0.6, 3.6), rim, verts=10)
cyl("Whip", 0.035, 8.0, (-2.2, 0.6, 7.75), whip, verts=8)
sphere("WhipTip", 0.16, (-2.2, 0.6, 11.8), purple, seg=10)
cyl("StatusLight", 0.12, 0.2, (0.5, 0.8, 3.55), purple, verts=10)
export(os.path.join(OUT, "transmitter.glb"))

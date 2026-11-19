"""Render a quick preview PNG of each exported GLB (for checking the models)."""
import math, os, sys
import bpy
args = sys.argv[sys.argv.index("--") + 1:]
src, out = args[0], args[1]
for f in ("df_station.glb", "transmitter.glb"):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(src, f))
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    xs = [v[0] for o in objs for v in o.bound_box]; r = max(abs(min(xs)), abs(max(xs)), 6)
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); bpy.context.scene.collection.objects.link(cam)
    cam.location = (r * 1.6, -r * 1.9, r * 1.1); cam.rotation_euler = (math.radians(68), 0, math.radians(40))
    bpy.context.scene.camera = cam
    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN")); sun.data.energy = 4
    sun.rotation_euler = (math.radians(45), math.radians(20), math.radians(30)); bpy.context.scene.collection.objects.link(sun)
    sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
    sc.render.resolution_x, sc.render.resolution_y = 640, 420
    sc.render.filepath = os.path.join(out, f.replace(".glb", ".png"))
    bpy.ops.render.render(write_still=True)
    print("rendered", sc.render.filepath)

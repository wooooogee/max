import cv2
import os

videos = [
    ("cf영상.mp4", "thumb_cf.jpg", 3.0),
    ("송가인 동영상 11.mp4", "thumb_songgain.jpg", 2.5),
    ("홍보영상(다양한 액티비티와 프로그램 소개).mp4", "thumb_activity.jpg", 4.0),
    ("홍보영상(동부지중해크루즈).mp4", "thumb_east_med.jpg", 3.5),
    ("홍보영상(알래스카 크루즈).mp4", "thumb_alaska.jpg", 4.0),
    ("홍보영상(두바이크루즈여행).mp4", "thumb_dubai.jpg", 3.5),
    ("MSC 크루즈동영.mp4", "thumb_msc.jpg", 3.0),
    ("홍보영상(지중해 기항지관광1).mp4", "thumb_west_med.jpg", 4.0),
]

os.makedirs("cruise/video_thumbs", exist_ok=True)

for vname, outname, sec in videos:
    vpath = os.path.join("cruise", vname)
    if not os.path.exists(vpath):
        print(f"File not found: {vpath}")
        continue
    cap = cv2.VideoCapture(vpath)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    target_frame = min(int(fps * sec), max(0, total_frames - 5))
    cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
    ret, frame = cap.read()
    if ret:
        outpath = os.path.join("cruise/video_thumbs", outname)
        cv2.imwrite(outpath, frame)
        print(f"Captured: {vname} at {sec}s -> {outpath} ({frame.shape[1]}x{frame.shape[0]})")
    else:
        print(f"Failed to read frame: {vname}")
    cap.release()

print("All thumbnails extracted!")

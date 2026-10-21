#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════════
 VÁ BẢN DỊCH TIẾNG VIỆT CHO C.W. WINES

 Vì sao cần: `crawl-cwwines.js` dịch mô tả bằng Google Translate thẳng, nên nó
 dịch luôn TÊN RIÊNG. Kết quả sai nặng trên một site bán rượu:

     "Bone Dry Shiraz"  → "Shiraz xương khô"
     "Old Vine Shiraz"  → "Cây nho già Shiraz"
     "Bone Dry Rosé"    → "Xương Khô Rosé"

 "Bone Dry" là TÊN DÒNG RƯỢU, "Old Vine" là tên sản phẩm — không phải mô tả.

 Cách chữa: che tên riêng bằng mã `QQ<n>QQ` TRƯỚC khi gửi đi dịch, rồi khôi
 phục nguyên văn sau khi dịch xong. Đã thử: mã dạng `QQ0QQ` đi qua Google
 Translate còn nguyên, không bị tách hay đổi chữ.

 Danh sách được che lấy TỪ CHÍNH DỮ LIỆU ĐÃ CÀO (tên hãng, tên bộ sưu tập, tên
 sản phẩm) cộng thêm từ điển giống nho và vùng rượu Úc — không ghim cứng.

 Chạy:  python3 scripts/scrapers/va-dich-cwwines.py [--thu]
        --thu = chỉ in 10 mẫu trước/sau, KHÔNG ghi đè file
═══════════════════════════════════════════════════════════════════════════════
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THU_MUC = os.path.join(GOC, "scrapers", "data")
FILE_SP = os.path.join(THU_MUC, "cwwines-products.jsonl")
FILE_DM = os.path.join(THU_MUC, "cwwines-categories.json")

# Giống nho — tên quốc tế, KHÔNG dịch sang tiếng Việt bao giờ.
GIONG_NHO = [
    "Cabernet Sauvignon", "Cabernet Franc", "Sauvignon Blanc", "Pinot Grigio",
    "Pinot Gris", "Pinot Noir", "Petit Verdot", "Chardonnay", "Riesling",
    "Grenache", "Tempranillo", "Sangiovese", "Nero d'Avola", "Viognier",
    "Semillon", "Malbec", "Merlot", "Shiraz", "Syrah", "Mataro", "Mourvedre",
    "Fiano", "Vermentino", "Moscato", "Muscat", "Prosecco", "Montepulciano",
    "Barbera", "Nebbiolo", "Zinfandel", "Gewurztraminer", "Chenin Blanc",
]

# Vùng trồng nho của Úc — địa danh, dịch ra là vô nghĩa
# ("Limestone Coast" → "Bờ biển đá vôi").
VUNG_RUOU = [
    "McLaren Vale", "Barossa Valley", "Clare Valley", "Limestone Coast",
    "Adelaide Hills", "Eden Valley", "Langhorne Creek", "Coonawarra",
    "Wrattonbully", "Padthaway", "Riverland", "Fleurieu Peninsula",
    "Yarra Valley", "Hunter Valley", "Margaret River", "Mount Benson",
    "South Australia", "Western Australia", "New South Wales", "Tasmania",
    "Victoria", "Barossa", "Adelaide",
]

# Cụm tên thương mại hay bị dịch bậy nhất.
CUM_THUONG_MAI = [
    "Bone Dry", "Old Vine", "Wine Club", "Gift Card", "Cellar Reserve",
    "Winemaker Series", "Limited Vineyard Release", "Lustre Collection",
    "Quarry Collection", "Dem Bones", "King Tide", "Peeping Tom",
    "Cape Barren", "Schild Estate", "Stonehaven", "Ulithorne", "Reschke",
    "Schoolhouse", "Fenetre Lavande", "CW Wines", "C.W. Wines",
    "Stepping Stone", "R-Series", "Club Pack", "6-Pack", "Mixed Pack",
    "Estate Range", "Estate Wine Club", "Vineyard Wine Club", "Cellar Door",
    "Bull Trader", "Vitulus", "Armenta", "Bos", "R.S.R", "Aureus", "Altus",
]


def tai_danh_sach_che():
    """Gom mọi tên riêng cần che, lấy từ chính dữ liệu đã cào."""
    ten = set(GIONG_NHO) | set(VUNG_RUOU) | set(CUM_THUONG_MAI)

    with open(FILE_SP, encoding="utf-8") as f:
        sp = [json.loads(d) for d in f if d.strip()]

    for x in sp:
        if x.get("brand"):
            ten.add(x["brand"].strip())
        t = (x.get("title") or "").strip()
        if t:
            ten.add(t)
            # Bỏ năm rượu ở cuối ("Old Vine Shiraz 2022" → "Old Vine Shiraz")
            khong_nam = re.sub(r"\s+(19|20)\d{2}\s*$", "", t).strip()
            if khong_nam and khong_nam != t:
                ten.add(khong_nam)

    if os.path.exists(FILE_DM):
        with open(FILE_DM, encoding="utf-8") as f:
            dm = json.load(f)
        for c in dm if isinstance(dm, list) else []:
            tt = (c.get("title") or c.get("ten") or "").strip()
            # Bỏ tên bộ sưu tập thuần chức năng — che chúng là thừa và dễ
            # nuốt mất chữ thường trong câu ("All wine", "Home page").
            if tt and len(tt) > 3 and not tt.lower() in {"all wine", "home page", "6-packs"}:
                ten.add(tt)

    # Dài trước ngắn sau: che "Bone Dry Shiraz" trước khi kịp che "Shiraz".
    return sorted({t for t in ten if len(t) >= 3}, key=len, reverse=True), sp


def che(text, danh_sach):
    """Thay tên riêng bằng mã QQ<n>QQ. Trả (chuỗi đã che, bảng khôi phục)."""
    bang = {}
    for ten in danh_sach:
        if ten not in text:
            continue
        ma = "QQ%dQQ" % len(bang)
        # Chỉ khớp trọn cụm, không cắt giữa từ.
        mau = re.compile(r"(?<![A-Za-z0-9])" + re.escape(ten) + r"(?![A-Za-z0-9])")
        moi, n = mau.subn(ma, text)
        if n:
            bang[ma] = ten
            text = moi
    return text, bang


def bo_che(text, bang):
    for ma, ten in bang.items():
        text = text.replace(ma, ten)
    # Google Translate đôi khi thêm khoảng trắng quanh mã.
    return re.sub(r"\s+([.,;:!?])", r"\1", text)


def goi_dich(text, so_lan=4):
    u = ("https://translate.googleapis.com/translate_a/single"
         "?client=gtx&sl=en&tl=vi&dt=t&q=" + urllib.parse.quote(text))
    for lan in range(1, so_lan + 1):
        try:
            req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                d = json.load(r)
            return "".join(s[0] for s in d[0] if s and s[0])
        except Exception as e:
            if lan == so_lan:
                print("    ✖ dịch hỏng:", e, file=sys.stderr)
                return ""
            time.sleep(1.5 * lan)
    return ""


def dich_co_che(text, danh_sach, cache):
    """Dịch từng đoạn, giữ nguyên xuống dòng."""
    ra = []
    for doan in text.split("\n"):
        if not doan.strip():
            ra.append(doan)
            continue
        if doan in cache:
            ra.append(cache[doan])
            continue
        da_che, bang = che(doan, danh_sach)
        dich = goi_dich(da_che)
        ket = bo_che(dich, bang) if dich else doan
        cache[doan] = ket
        ra.append(ket)
        time.sleep(0.12)
    return "\n".join(ra)


def main():
    thu = "--thu" in sys.argv
    danh_sach, sp = tai_danh_sach_che()
    print("Danh sách tên riêng được che: %d cụm" % len(danh_sach))
    print("Sản phẩm: %d\n" % len(sp))

    cache = {}
    doi = 0
    for i, x in enumerate(sp, 1):
        goc = (x.get("description") or "").strip()
        if not goc:
            continue
        cu = x.get("descriptionVi") or ""
        moi = dich_co_che(goc, danh_sach, cache)
        if moi and moi != cu:
            x["descriptionVi"] = moi
            doi += 1
        if thu and i <= 10:
            print("--- %s" % x["title"])
            print("  CŨ : %s" % cu[:110].replace("\n", " "))
            print("  MỚI: %s\n" % moi[:110].replace("\n", " "))
        if i % 25 == 0:
            print("  ... %d/%d" % (i, len(sp)))
        if thu and i >= 10:
            break

    if thu:
        print("\n(--thu: KHÔNG ghi đè file)")
        return

    # Ghi ra file tạm rồi mới thay — đứt giữa chừng không mất dữ liệu gốc.
    tam = FILE_SP + ".tam"
    with open(tam, "w", encoding="utf-8") as f:
        for x in sp:
            f.write(json.dumps(x, ensure_ascii=False) + "\n")
    so_dong = sum(1 for _ in open(tam, encoding="utf-8"))
    if so_dong != len(sp):
        print("✖ File tạm có %d dòng, chờ %d — KHÔNG thay." % (so_dong, len(sp)), file=sys.stderr)
        sys.exit(1)
    os.replace(tam, FILE_SP)
    print("\n✓ Đã cập nhật %d mô tả trong %d sản phẩm (%d dòng)." % (doi, len(sp), so_dong))


if __name__ == "__main__":
    main()

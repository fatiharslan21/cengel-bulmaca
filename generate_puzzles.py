"""
Çengel Bulmaca Üretici v3
- Paralel komşuluk kesinlikle yasak (iç içe girme olmaz)
- Her hücre max 1 yatay + 1 dikey kelimeye ait
- Kelime önü/sonu mutlaka boş
- Türkçe İ≠I tam ayrım
"""
import json,os,random,glob,sys
random.seed(2026)

VALID=set("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ")

WORDS=[
("ACI","Tatlının zıttı"),("ADA","Dört tarafı suyla çevrili kara"),
("AFİ","Yakışıklı, gösterişli"),("AĞA","Toprak sahibi"),
("AİT","Bir şeye ilişkin"),("ALA","Benekli, alacalı"),
("ALT","Üstün karşıtı"),("ANI","Hatıra, geçmiş olay"),
("ARA","İki şey arası boşluk"),("ARI","Bal yapan böcek"),
("ARZ","Sunma, takdim"),("AŞI","Koruyucu ilaç"),
("ATA","Ced, büyükbaba"),("AYA","Elin iç kısmı"),
("BAĞ","Üzüm bahçesi"),("BAL","Arı ürünü tatlı"),
("BAŞ","Kafa, vücudun üstü"),("BAZ","Asit karşıtı"),
("BEL","Vücudun orta bölümü"),("BEN","Birinci tekil kişi"),
("BEZ","Dokuma kumaş parçası"),("BİN","On yüzlük sayı"),
("BİR","İlk doğal sayı"),("BOL","Çok miktarda"),
("BOŞ","İçi dolu olmayan"),("BOY","Uzunluk, endam"),
("BUZ","Donmuş su"),("CAN","Hayat, yaşam"),
("CEP","Giyside küçük kese"),("ÇAĞ","Devir, dönem"),
("ÇAM","İğne yapraklı ağaç"),("ÇAN","Ses çıkaran metal"),
("ÇAP","Daire çapı"),("ÇAY","Sıcak içecek"),
("ÇİT","Bahçe engeli"),("ÇÖL","Kurak kumluk arazi"),
("DAĞ","Yüksek arazi şekli"),("DAL","Ağacın kolu"),
("DAM","Evin çatısı"),("DAR","Geniş olmayan"),
("DİL","Konuşma organı"),("DİŞ","Çiğneme organı"),
("DIŞ","Harici, dış yüzey"),("DON","Buz tutma"),
("DÖN","Yön değiştir"),("DUŞ","Su ile yıkanma"),
("DÜŞ","Rüya, hayal"),("EĞE","Tırnak törpüsü"),
("FİL","Dev kara hayvanı"),("GAZ","Hava gibi madde"),
("GEL","Yaklaşma eylemi"),("GİT","Uzaklaşma eylemi"),
("GÖL","Karalarla çevrili su"),("GÖZ","Görme organı"),
("GÜÇ","Kuvvet, enerji"),("GÜL","Dikenli güzel çiçek"),
("GÜN","24 saatlik süre"),("HAK","Adalet, doğruluk"),
("HAL","Durum, vaziyet"),("HAT","Çizgi, yol"),
("HİÇ","Asla, kesinlikle hayır"),("HOŞ","Güzel, tatlı"),
("İLK","Birinci, baştaki"),("İYİ","Kötünün zıttı"),
("KAL","Gitme, burada dur"),("KAN","Damar sıvısı"),
("KAP","İçine konan kab"),("KAR","Beyaz yağış"),
("KAŞ","Göz üstü kıl şeridi"),("KAT","Bina bölümü"),
("KIŞ","En soğuk mevsim"),("KİL","Seramik toprağı"),
("KOL","Üst beden uzvu"),("KOR","Ateş közü"),
("KUŞ","Kanatlı uçan hayvan"),("KÜL","Yanık kalıntısı"),
("MAL","Mülk, eşya"),("MOR","Eflatun renk"),
("MUM","Fitilli aydınlatma"),("MUZ","Tropikal meyve"),
("NAR","Kırmızı taneli meyve"),("NAZ","İşve, cilve"),
("NEM","Havadaki rutubet"),("ODA","Ev bölümü"),
("OYA","İğneyle süsleme"),("PAS","Demir korozyonu"),
("PUL","Mektup pulu"),("RUH","Can, maneviyat"),
("SAÇ","Baştaki kıllar"),("SAP","Bitki gövdesi"),
("SES","İşitilen titreşim"),("SIR","Gizli bilgi"),
("SOL","Sağın karşıtı"),("SON","Bitiş, final"),
("SOY","Nesil, aile kökeni"),("SÜT","Beyaz besin sıvısı"),
("ŞAL","Omuz örtüsü"),("ŞAN","Ün, şöhret"),
("ŞEF","Lider, baş aşçı"),("TAŞ","Sert kayaç parçası"),
("TAT","Damaktaki lezzet"),("TEN","Cilt, deri"),
("TIP","Hekimlik bilimi"),("TON","Bin kilogram"),
("TOZ","İnce parçacıklar"),("TUZ","Lezzet verici"),
("TÜR","Çeşit, tür"),("ULU","Yüce, büyük"),
("VAN","Göllü doğu ili"),("YAĞ","Kaygan besin"),
("YAR","Uçurum, yarık"),("YAŞ","Ömür süresi"),
("YAZ","Sıcak mevsim"),("YEL","Rüzgar, esinti"),
("YER","Mekan, konum"),("YOL","Güzergah, patika"),
("YÜZ","Çehre; sayı 100"),("ZAR","Oyun küpü"),
("ZOR","Güç, kolay değil"),
("ADIM","Yürüyüş mesafesi"),("AĞAÇ","Gövdeli bitki"),
("AĞIR","Hafif olmayan"),("AKIL","Düşünme yetisi"),
("AKIM","Elektrik hareketi"),("ALAN","Geniş düzlük"),
("ALEV","Ateşin parlak kısmı"),("AMAÇ","Hedef, gaye"),
("ARZU","İstek, dilek"),("ASIL","Gerçek, hakiki"),
("AŞÇI","Yemek pişiren"),("ATEŞ","Yanan ısı ve ışık"),
("AVCI","Av yapan kişi"),("AYAK","Bacak ucu"),
("AYNA","Yansıtıcı cam"),("BANT","Yapışkan şerit"),
("BELA","Felaket, kötülük"),("BİNA","Yapı, bina"),
("BORU","Sıvı geçen tüp"),("BOYA","Renk veren madde"),
("BURÇ","Zodyak işareti"),("CEZA","Suça yaptırım"),
("ÇAKI","Katlanır bıçak"),("ÇALI","Bodur ağaç"),
("ÇARE","Çözüm yolu"),("ÇİFT","İki adet, eş"),
("DAMA","Tahta oyunu"),("DANS","Müzikle hareket"),
("DEFA","Kez, kere"),("DERE","Küçük akarsu"),
("DERT","Sıkıntı, üzüntü"),("DEVE","Hörgüçlü hayvan"),
("DOLU","Boş olmayan"),("DOST","Yakın arkadaş"),
("DÖRT","Üçten sonra gelen"),("ELMA","Kırmızı meyve"),
("EMİR","Buyruk, komut"),("ESER","Sanat yapıtı"),
("EŞEK","Yük hayvanı"),("EŞYA","Kullanılan nesneler"),
("FARE","Küçük kemirgen"),("FARK","Ayrım, değişiklik"),
("FENA","Kötü, berbat"),("GECE","Karanlık zaman"),
("GEMİ","Deniz taşıtı"),("GERİ","İlerinin zıttı"),
("HANE","Ev, konut"),("HAVA","Solunan gaz"),
("HECE","Ses birimi"),("İĞNE","Sivri dikiş aracı"),
("İLAÇ","Tedavi maddesi"),("İNCE","Kalın olmayan"),
("İPEK","Böcekten kumaş"),("KAFA","Baş, kelle"),
("KALE","Savunma yapısı"),("KARA","Siyah renk"),
("KART","Düz ince levha"),("KASE","Çukur yemek kabı"),
("KAYA","Büyük sert taş"),("KAZI","Toprak eşme"),
("KEDİ","Miyavlayan evcil"),("KENT","Şehir"),
("KIRA","Ev bedeli"),("KOKU","Burnun algısı"),
("KOVA","Su kabı"),("KÖŞE","Yüzeylerin birleşimi"),
("KUĞU","Zarif su kuşu"),("KULE","Yüksek yapı"),
("KUPA","Ödül bardağı"),("KUTU","Eşya kabı"),
("LALE","Türk simgesi çiçek"),("LİRA","Türk parası"),
("MASA","Yemek mobilyası"),("MAŞA","Ateş aleti"),
("MERA","Otlak alan"),("MOLA","Kısa dinlenme"),
("NANE","Ferahlatıcı bitki"),("NOTA","Müzik işareti"),
("OKUL","Eğitim kurumu"),("ORDU","Silahlı kuvvetler"),
("OTEL","Konaklama yeri"),("OYUN","Eğlence faaliyeti"),
("ÖDEV","Yapılması gereken iş"),("ÖDÜL","Başarı karşılığı"),
("ÖMÜR","Yaşam süresi"),("ÖRTÜ","Üstünü kapatan"),
("PARK","Yeşil alan"),("PİDE","Yassı ekmek"),
("PUAN","Sayısal değer"),("RÜYA","Uykuda hayal"),
("SAAT","Zaman ölçer"),("SARI","Altın rengi"),
("SAYI","Rakam ifadesi"),("SERA","Bitki yapısı"),
("SORU","Cevap bekleyen"),("SÜRE","Zaman aralığı"),
("ŞANS","Talih, baht"),("ŞATO","Görkemli yapı"),
("TANE","Adet, parça"),("TARZ","Biçim, üslup"),
("TAZE","Bayat olmayan"),("TEPE","Küçük yükselti"),
("TOKA","Bağlama aracı"),("TOST","Kızarmış sandviç"),
("TREN","Raylı taşıt"),("TÜRK","Anadolu halkı"),
("UÇAK","Havada uçan taşıt"),("UZAK","Yakın olmayan"),
("VAZO","Çiçek süs kabı"),("YAKA","Gömlek boyun kısmı"),
("YAMA","Yırtık yamağı"),("YARA","Doku hasarı"),
("YAZI","Yazılmış metin"),("YUVA","Kuş evi"),
("YURT","Vatan"),("ZEKA","Anlama yeteneği"),
("ADRES","Konum bilgisi"),("ARABA","Dört tekerlekli taşıt"),
("ATLAS","Harita kitabı"),("BAHÇE","Evin yeşil alanı"),
("BALIK","Suda yaşayan canlı"),("BİLGİ","Öğrenilen her şey"),
("BİLEK","El kol eklemi"),("BOYUT","Ölçü, ebat"),
("BULUT","Gökyüzü su kümeleri"),("CADDE","Geniş ana yol"),
("ÇEVRE","Etraf, çepeçevre"),("ÇİÇEK","Bitkinin renkli kısmı"),
("ÇINAR","Gölge ağacı"),("DENİZ","Tuzlu büyük su"),
("DENEY","Bilimsel test"),("DEVAM","Sürdürme"),
("DOLAP","Eşya mobilyası"),("DÜNYA","Yaşadığımız gezegen"),
("EKMEK","Temel buğday gıdası"),("ELMAS","En sert taş"),
("ERKEN","Vaktinden önce"),("GÖLGE","Işık arkası"),
("HABER","Yeni bilgi"),("HAKEM","Maç yöneticisi"),
("HAYAL","Gerçek olmayan düş"),("HESAP","Sayısal işlem"),
("ISLAK","Suyla ıslanmış"),("KALEM","Yazı aleti"),
("KAŞIK","Yemek aracı"),("KENAR","Yüzeyin sınırı"),
("KİRAZ","Küçük kırmızı meyve"),("KİTAP","Sayfalardan eser"),
("KÖPEK","Sadık evcil hayvan"),("KÖPRÜ","İki yakayı birleştiren"),
("KUKLA","İple oynatılan"),("KURAL","Uyulması gereken"),
("LAMBA","Aydınlatma aracı"),("LİMAN","Gemi barınağı"),
("MASAL","Hayal ürünü hikaye"),("MELEK","Kanatlı kutsal varlık"),
("MERAK","Bilme isteği"),("MEYVE","Bitkinin ürünü"),
("NEFES","Soluk alma verme"),("NOKTA","En küçük işaret"),
("ORGAN","Vücut bölümü"),("ORMAN","Ağaçlık alan"),
("PAKET","Ambalajlı koli"),("PASTA","Kutlama tatlısı"),
("PİLOT","Uçak kullanan"),("POSTA","Mektup servisi"),
("RADAR","Algılama sistemi"),("ROBOT","Programlanabilir makine"),
("SABAH","Günün başı"),("SAHİL","Deniz kıyısı"),
("SALON","Büyük oda"),("SARAY","Hükümdar konutu"),
("SEBZE","Yenilebilen bitki"),("ŞEKER","Tatlı madde"),
("TABAK","Yemek kabı"),("TARLA","Ekin alanı"),
("TAVLA","Zar masa oyunu"),("TEKNE","Küçük deniz taşıtı"),
("VATAN","Yurt, memleket"),("YAZAR","Kitap yazan"),
("ZİRVE","En yüksek nokta"),("ZURNA","Nefesli çalgı"),
("ANKARA","Başkent"),("BALKON","Bina çıkıntısı"),
("BARDAK","İçecek kabı"),("BAYRAK","Ülke simgesi"),
("BERBER","Saç kesen esnaf"),("BÜLBÜL","Güzel öten kuş"),
("ÇEMBER","Daire çevresi"),("DARBE","Ani vuruş"),
("DEVLET","Ülke yönetimi"),("DÜDÜK","Üflemeli ses aleti"),
("EFSANE","Söylence, mit"),("FUTBOL","Popüler top oyunu"),
("GÖMLEK","Üst giysi"),("GÜNDEM","Konular listesi"),
("HAZİNE","Değerli şeyler"),("KAMYON","Yük aracı"),
("KARTAL","Yırtıcı büyük kuş"),("MERKEZ","Orta nokta"),
("MÜZİK","Seslerle sanat"),("SABUN","Temizlik maddesi"),
("SANDAL","Kürekli tekne"),("YAPRAK","Bitkinin yeşil organı"),
("ANAHTAR","Kilit açma aleti"),("BALİNA","Okyanus memelisi"),
("BULMACA","Çözülecek oyun"),("DEPREM","Yer sarsıntısı"),
("HASTANE","Tedavi merkezi"),("HİKAYE","Anlatılan olay"),
("KELEBEK","Renkli kanatlı böcek"),("KARINCA","Çalışkan böcek"),
("OTOBÜS","Toplu taşıma"),("PAPATYA","Beyaz kır çiçeği"),
("TELEFON","İletişim cihazı"),("YAĞMUR","Gökten su damlaları"),
]

# Eski Türkçe / Osmanlıca (Zor seviye)
ARCHAIC_WORDS=[
("ARZ","Sunma, takdim"),("BAHT","Talih, şans"),
("CEHD","Çaba, gayret"),("DAVA","İddia, tez"),
("ELEM","Keder, acı"),("EMEL","Özlenen istek"),
("ECEL","Ölüm vakti"),("EDEP","Terbiye, görgü"),
("FARZ","Mutlaka yapılması gereken"),("FENA","Kötü, berbat"),
("GAYE","Amaç, maksat"),("HATA","Yanlış, kusur"),
("HAYA","Utanma duygusu"),("HİLE","Düzen, oyun"),
("HİSSE","Pay, nasip"),("İDRAK","Anlayış"),
("İFFET","Namus, iffet"),("İKBAL","Talih, yükselme"),
("İLAM","Bildirme, hüküm"),("İMAN","İnanç"),
("İRFAN","Bilme, anlayış"),("İZAH","Açıklama"),
("KADER","Alın yazısı"),("KEDER","Üzüntü"),
("KELAM","Söz, laf"),("KEMAL","Olgunluk"),
("KISMET","Nasip, pay"),("KUDRET","Güç, kuvvet"),
("LİSAN","Dil, konuşma"),("LÜTUF","İyilik, bağış"),
("MAHŞER","Kıyamet yeri"),("MATEM","Yas, acı"),
("MAZİ","Geçmiş zaman"),("MEKAN","Yer, mahal"),
("MELAL","Hüzün, usanç"),("MERAM","Amaç, arzu"),
("MEVKİ","Yer, konum"),("MEZAR","Kabir"),
("MİSAL","Örnek, benzer"),("MÜJDE","İyi haber"),
("NAFİLE","Boşuna, yararsız"),("NAKİL","Taşıma, aktarma"),
("NAZAR","Bakış, göz"),("NİDA","Seslenme"),
("NİMET","İyilik, bolluk"),("NİYAZ","Yakarma"),
("PERDE","Örtü, perde"),("RAKİP","Hasım, muhalif"),
("REFAH","Bolluk, huzur"),("RİCA","Yalvarma, dilek"),
("SABIR","Katlanma, dayanma"),("SADA","Ses, seda"),
("SAFA","Gönül huzuru"),("SANİYE","Kısa an"),
("SELAM","Esenleme sözü"),("SERAP","Hayal, ilüzyon"),
("ŞEREF","Onur, itibar"),("ŞEVK","Arzu, istek"),
("ŞÖHRET","Ün, nam"),("TABİ","Uyan, bağlı"),
("TAKDİR","Beğenme, övme"),("TALEP","İstek"),
("TALİH","Şans, baht"),("TEMEL","Esas, kök"),
("USUL","Yöntem, tarz"),("VAHİM","Ağır, kötü"),
("VAKİT","Zaman, süre"),("VEDA","Ayrılırken selam"),
("VEFA","Sözünde durma"),("ZAHMET","Güçlük, eziyet"),
("ZEVAL","Yok olma"),("ZEVK","Haz, keyif"),
]

# Edebî / Nadir (Çok Zor seviye)
LITERARY_WORDS=[
("ASUDE","Sakin, huzurlu"),("BEDİA","Eşsiz güzellik"),
("CEVAP","Yanıt, karşılık"),("DERUN","İç, iç yüz"),
("ECİR","Karşılık, sevap"),("EZEL","Başlangıcı olmayan"),
("FİGAN","Feryat, ağlama"),("FIRAK","Ayrılık"),
("GAFİL","Habersiz, aymaz"),("GAYR","Başka, özge"),
("HASRET","Özlem, göresi"),("HİCAP","Utanç, çekinme"),
("HİCRAN","Ayrılık acısı"),("HULUS","İçten bağlılık"),
("HUZUR","İç rahatlığı"),("İLHAM","Esin, sezgi"),
("KANAAT","Yetinme, razı olma"),("LATİF","Hoş, ince"),
("MAHLAS","Takma ad, isim"),("MAHZUN","Üzgün, kederli"),
("MANA","Anlam, mana"),("MEFTUN","Tutkun, vurgun"),
("MİLAT","Başlangıç tarihi"),("MUAMMA","Giz, bilmece"),
("MUNİS","Uysal, yumuşak"),("NAĞME","Ezgi, tını"),
("NAZİK","İnce, kibar"),("NEZİH","Temiz, arı"),
("NÜKTE","İnce söz, espri"),("RAST","Tesadüf, denk gelme"),
("REHAVET","Gevşeklik"),("RİYA","İkiyüzlülük"),
("SADAKAT","Bağlılık, vefa"),("SEMA","Gökyüzü"),
("SEVDA","Aşk, tutku"),("SUKUT","Düşme, sessizlik"),
("ŞAFAK","Gün ağarması"),("ŞEFKAT","Sevgi, acıma"),
("TECELLİ","Görünme, belirme"),("TEESSÜR","Üzülme"),
("TELAŞ","Heyecan, kaygı"),("TENHA","Issız, boş"),
("TESELLİ","Avunma, avuntu"),("TEVAZU","Alçakgönüllülük"),
("ULVİ","Yüce, manevi"),("VECİZE","Özlü söz"),
("YADİGAR","Hatıra, armağan"),("ZAAF","Güçsüzlük"),
("ZİYA","Işık, aydınlık"),("ZÜMRE","Topluluk, küme"),
]

class Builder:
    def __init__(self, max_sz=20):
        self.mx = max_sz
        self.cells = {}       # (r,c) -> char
        self.cell_dirs = {}   # (r,c) -> set of directions using this cell
        self.words = []
        self.placed_set = set()
        self.mn_r=self.mn_c=999
        self.mx_r=self.mx_c=-999

    def _upd(self,r,c):
        self.mn_r=min(self.mn_r,r);self.mx_r=max(self.mx_r,r)
        self.mn_c=min(self.mn_c,c);self.mx_c=max(self.mx_c,c)

    def _wc(self,w,r,c,d):
        return [(r+(i if d=="down" else 0), c+(i if d=="across" else 0), ch) for i,ch in enumerate(w)]

    def can_place(self, word, r, c, d):
        cells = self._wc(word, r, c, d)
        cross = len(self.words)==0
        
        for rr,cc,ch in cells:
            # Boyut kontrolü
            mr=min(self.mn_r,rr);Mr=max(self.mx_r,rr)
            mc=min(self.mn_c,cc);Mc=max(self.mx_c,cc)
            if Mr-mr+1>self.mx or Mc-mc+1>self.mx:
                return False
            
            ex = self.cells.get((rr,cc))
            if ex is not None:
                if ex != ch:
                    return False
                # Bu hücre zaten bu yöndeki bir kelimeye aitse → paralel olur
                if d in self.cell_dirs.get((rr,cc), set()):
                    return False
                cross = True
            else:
                # YENİ HÜCRE: paralel komşu kontrolü
                # Yatay kelime koyuyorsak, üst/alt komşu boş olmalı (kesişim noktası hariç)
                if d == "across":
                    for dr in [-1, 1]:
                        nr = rr + dr
                        if (nr,cc) in self.cells and (nr,cc) not in [(r2,c2) for r2,c2,_ in cells if self.cells.get((r2,c2))==self._wc(word,r,c,d)]:
                            # Komşu dolu ama bizim kelimenin parçası değil
                            return False
                else:  # down
                    for dc in [-1, 1]:
                        nc = cc + dc
                        if (rr,nc) in self.cells:
                            return False

        if not cross:
            return False

        # Kelime öncesi/sonrası boş olmalı
        if d == "across":
            if (r, c-1) in self.cells or (r, c+len(word)) in self.cells:
                return False
        else:
            if (r-1, c) in self.cells or (r+len(word), c) in self.cells:
                return False

        return True

    def place(self, word, r, c, d, clue):
        for rr,cc,ch in self._wc(word,r,c,d):
            self.cells[(rr,cc)] = ch
            if (rr,cc) not in self.cell_dirs:
                self.cell_dirs[(rr,cc)] = set()
            self.cell_dirs[(rr,cc)].add(d)
            self._upd(rr,cc)
        self.words.append((word,r,c,d,clue))
        self.placed_set.add(word)

    def find_pos(self, word):
        pos = []
        for pw,pr,pc,pd,_ in self.words:
            for i,pch in enumerate(pw):
                for j,wch in enumerate(word):
                    if pch==wch:
                        if pd=="across":
                            nr,nc = pr-j, pc+i
                            if self.can_place(word,nr,nc,"down"):
                                pos.append((nr,nc,"down"))
                        else:
                            nr,nc = pr+i, pc-j
                            if self.can_place(word,nr,nc,"across"):
                                pos.append((nr,nc,"across"))
        return pos

    def build(self, pool, target):
        random.shuffle(pool)
        w0,c0 = pool[0]
        self.place(w0, 0, 0, "across", c0)
        
        rest = pool[1:]
        fails = 0
        idx = 0
        
        while len(self.words)<target and fails<len(rest)*3:
            if idx>=len(rest): idx=0
            w,cl = rest[idx]
            if w in self.placed_set:
                idx+=1; fails+=1; continue
            ps = self.find_pos(w)
            if ps:
                # Merkeze yakın olanı seç
                cr = (self.mn_r+self.mx_r)/2
                cc = (self.mn_c+self.mx_c)/2
                ps.sort(key=lambda p: abs(p[0]-cr)+abs(p[1]-cc))
                r,c,d = ps[0]
                self.place(w,r,c,d,cl)
                fails=0
            else:
                fails+=1
            idx+=1
        return len(self.words)

    def to_json(self, pid, title, diff):
        if not self.words: return None
        off_r,off_c = self.mn_r, self.mn_c
        h = self.mx_r-self.mn_r+1
        w = self.mx_c-self.mn_c+1
        
        grid = [[0]*w for _ in range(h)]
        for (r,c) in self.cells:
            grid[r-off_r][c-off_c]=1

        nm={}; cnt=0
        nw = sorted(self.words, key=lambda x:(x[1],x[2]))
        wd=[]
        for word,r,c,d,clue in nw:
            nr,nc = r-off_r, c-off_c
            k=(nr,nc)
            if k not in nm: cnt+=1; nm[k]=cnt
            wd.append({"number":nm[k],"direction":d,"row":nr,"col":nc,
                       "length":len(word),"clue":clue,"answer":word})
        return {"id":pid,"title":title,"difficulty":diff,
                "grid_size_r":h,"grid_size_c":w,"grid":grid,"words":wd}


def _dedupe(words_list):
    """Aynı kelimenin tekrarını at"""
    seen = {}
    for w,c in words_list:
        if all(ch in VALID for ch in w) and w not in seen:
            seen[w] = (w,c)
    return list(seen.values())

def generate_all():
    os.makedirs("data", exist_ok=True)
    basic = _dedupe(WORDS)
    archaic = _dedupe(ARCHAIC_WORDS)
    literary = _dedupe(LITERARY_WORDS)

    # Zorluk = kelime dağarcığı. Grid boyutu hepsi için mobil dostu.
    # (diff, count, max_sz, (min_len,max_len), target_words, pool_builder)
    cfgs = [
        ("Kolay",   125, 12, (3,5),  9,  lambda: basic),
        ("Orta",    125, 12, (3,6),  10, lambda: basic),
        # Zor: günlük kelimelerin yanına eski Türkçe karıştır
        ("Zor",     125, 12, (3,6),  10, lambda: basic + archaic + archaic),
        # Çok Zor: ağırlıklı eski/edebî kelimeler
        ("Çok Zor", 125, 12, (3,7),  10, lambda: basic + archaic*2 + literary*3),
    ]

    pid=0; tw=0
    for diff,cnt,msz,(mn,mx),tgt,pool_fn in cfgs:
        raw_pool = pool_fn()
        filt=[(w,c) for w,c in raw_pool if mn<=len(w)<=mx]
        for i in range(cnt):
            pid+=1
            best=None
            for _ in range(10):
                random.shuffle(filt)
                b=Builder(msz)
                b.build(filt[:80],tgt)
                d=b.to_json(pid,f"Bölüm {pid}",diff)
                if d and (best is None or len(d["words"])>len(best["words"])):
                    best=d
                if best and len(best["words"])>=tgt:
                    break
            if best:
                with open(f"data/puzzle_{pid:03d}.json","w",encoding="utf-8") as f:
                    json.dump(best,f,ensure_ascii=False,indent=2)
                tw+=len(best["words"])
        print(f"  ✓ {diff}: {cnt} bölüm")
    print(f"\n✅ {pid} bulmaca, {tw} kelime")


def add_levels(count=1):
    """100 sonrası Çok Zor bölüm ekle"""
    basic = _dedupe(WORDS)
    archaic = _dedupe(ARCHAIC_WORDS)
    literary = _dedupe(LITERARY_WORDS)
    raw_pool = basic + archaic*2 + literary*3
    filt=[(w,c) for w,c in raw_pool if 3<=len(w)<=7]

    files=glob.glob(os.path.join("data","puzzle_*.json"))
    nxt = max(int(os.path.basename(f)[7:10]) for f in files)+1 if files else 1

    for i in range(count):
        pid=nxt+i
        random.seed(pid*37+13)
        best=None
        for _ in range(10):
            random.shuffle(filt)
            b=Builder(12)
            b.build(filt[:80],10)
            d=b.to_json(pid,f"Bölüm {pid}","Çok Zor")
            if d and (best is None or len(d["words"])>len(best["words"])):
                best=d
        if best:
            with open(f"data/puzzle_{pid:03d}.json","w",encoding="utf-8") as f:
                json.dump(best,f,ensure_ascii=False,indent=2)
            print(f"  ✅ Bölüm {pid} ({len(best['words'])} kelime)")

if __name__=="__main__":
    if len(sys.argv)>1 and sys.argv[1]=="add":
        n=int(sys.argv[2]) if len(sys.argv)>2 else 1
        add_levels(n)
    else:
        generate_all()

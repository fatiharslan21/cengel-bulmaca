#!/usr/bin/env python3
"""Her benzersiz cevap için doğal, açıklayıcı ipucu uygulayan script.

Yapıyı (grid, kelime konumları, cevaplar) değiştirmez; sadece `clue` alanını
güncelleştirir. Haritada yoksa veya cevap içinde cevabın kendisi geçiyorsa
clue'yu olduğu gibi bırakır (güvenlik için).
"""
import glob
import json
import re
from pathlib import Path

TR_RE = re.compile(r'[^a-zçğıöşü]')


def norm(s: str) -> str:
    return TR_RE.sub('', (s or '').lower())


# Her cevap için doğal, cümle/ibare biçiminde açıklayıcı ipucu.
CLUES: dict[str, str] = {}

# --- A ---
CLUES.update({
    "ACI": "Tatlının tam karşıtı olan, biberin ya da kederin bıraktığı keskin duygu.",
    "ADA": "Dört bir yanı suyla çevrili, denizin ortasında kalmış toprak parçası.",
    "ADIM": "Yürürken bir ayağın diğerinin önüne atılmasıyla alınan kısa mesafe.",
    "ADRES": "Bir kimseye veya yere ulaşabilmek için gereken açık konum bilgisi.",
    "AFİ": "Halk ağzında yakışıklı, gösterişli kimse için kullanılan eski bir sözcük.",
    "AKIL": "İnsanın düşünmesini, anlamasını ve karar vermesini sağlayan zihinsel yeti.",
    "AKIM": "Belirli bir yönde hareket eden elektrik yükü ya da suyun sürüklenişi.",
    "ALA": "Birden çok rengin bir arada bulunduğu, benekli ya da karışık görünüm.",
    "ALAN": "Üzerinde yapı bulunmayan, belli sınırlarla çevrili geniş açık düzlük.",
    "ALEV": "Yanan bir şeyin üstünde dalgalanan, sıcak ve parlayan ışıklı kısım.",
    "ALT": "Bir cismin aşağı tarafı; üst sözcüğünün tam karşıtı olan yön.",
    "AMAÇ": "Bir işin başında konulan, ulaşılmak istenen hedef ya da gaye.",
    "ANAHTAR": "Kilidi açıp kapatmak için yapılmış, dişli küçük metal araç.",
    "ANI": "Geçmişte yaşanmış ve zihinde iz bırakmış olayların hatırlanması.",
    "ANKARA": "Türkiye Cumhuriyeti'nin başkenti ve İç Anadolu'nun en büyük şehri.",
    "ARA": "İki şeyin birbirinden ayrıldığı boşluk; kısa mola süresi.",
    "ARABA": "Tekerlekleri üstünde insan ya da yük taşıyan motorlu kara taşıtı.",
    "ARI": "Çiçeklerden topladığı nektarı bala dönüştüren, iğneli küçük böcek.",
    "ARZ": "Bir üstün ya da yetkilinin önüne saygıyla sunma, takdim etme eylemi.",
    "ARZU": "İçten duyulan istek, gönülden beklenen dilek veya özlem.",
    "ASIL": "Sahte ya da taklit olmayan; bir şeyin gerçek ve temel olan hali.",
    "ASUDE": "Gürültüden uzak, hiçbir telaşın olmadığı sessiz ve huzurlu ortam.",
    "ATA": "Soyun büyüklerinden sayılan dede ya da daha öncesinden gelen büyük.",
    "ATEŞ": "Yanmakta olan bir maddenin çıkardığı ısı, ışık ve alevin tümü.",
    "ATLAS": "Dünyanın farklı bölgelerini gösteren haritaların toplandığı büyük kitap.",
    "ATOM": "Maddeyi oluşturan, gözle görülemeyecek kadar küçük temel yapı taşı.",
    "AVCI": "Kırda ya da ormanda silahla veya tuzakla av peşinde koşan kişi.",
    "AYA": "Elin iç tarafı; parmakların bittiği yerden bileğe kadar uzanan bölüm.",
    "AYAK": "Bacağın bileğinden aşağısı; üzerine basarak yürümemizi sağlayan uzuv.",
    "AYNA": "Karşısına geçenin görüntüsünü aynen yansıtan sırlanmış cam yüzey.",
    "AĞA": "Eskiden köylerde geniş topraklara sahip, sözü geçen nüfuzlu kişi.",
    "AĞAÇ": "Toprağa kök salmış, gövdesi odunlaşmış, uzun ömürlü büyük bitki.",
    "AĞIR": "Kaldırılması güç olan, hafif sözcüğünün zıttı sayılan kütle durumu.",
    "AİT": "Bir şeye bağlı bulunma; onunla ilgili ya da onun sahipliğinde olma.",
    "AŞI": "Bir hastalığa karşı bağışıklık kazandırmak için vücuda verilen ilaç.",
    "AŞÇI": "Mutfakta yemek pişirmeyi meslek edinmiş, lezzetten anlayan kişi.",
})

# --- B ---
CLUES.update({
    "BAHT": "İnsanın başına gelenleri belirlediğine inanılan şans, talih ya da kader.",
    "BAHÇE": "Ev ya da yapı yakınında çiçek, sebze ve ağaç yetiştirilen yeşil alan.",
    "BAL": "Arıların çiçeklerden topladığı nektarı işleyerek yaptığı koyu, tatlı gıda.",
    "BALIK": "Suda yaşayan, solungaçlarıyla soluyan, yüzgeçleriyle hareket eden canlı.",
    "BALKON": "Bir binanın üst katlarından dışarı uzanan, parmaklıkla çevrili çıkıntı.",
    "BALİNA": "Okyanuslarda yaşayan, dünyanın en büyük sayılan memeli deniz canlısı.",
    "BANT": "Bir tarafı yapışkan olan, eşyaları tutturmaya yarayan uzun ince şerit.",
    "BARDAK": "Su, çay ya da başka içecekleri içmek için kullanılan küçük kap.",
    "BAYRAK": "Bir ülkeyi simgeleyen, özel renk ve işaretler taşıyan kumaş parçası.",
    "BAZ": "Kimyada asitle tepkimeye girerek tuz oluşturan, karşıt özellikli madde.",
    "BAĞ": "Üzüm yetiştirilen tarla; aynı zamanda düğümle tutturma eylemi.",
    "BAŞ": "İnsanın boynundan yukarısı, beynin ve yüzün bulunduğu vücut bölümü.",
    "BEDİA": "Eşine az rastlanan, olağanüstü güzellikteki nadide eser ya da yaratılış.",
    "BEL": "Göğüs kafesi ile kalçalar arasında kalan, vücudun orta kısmı.",
    "BELA": "İnsanın başına habersizce gelen ağır dert, büyük sıkıntı ya da musibet.",
    "BEN": "Konuşan kişinin kendisini belirtmek için kullandığı birinci tekil zamir.",
    "BERBER": "Erkeklerin saçını kesip sakalını düzelten, dükkânında çalışan esnaf.",
    "BEZ": "Silmek, temizlemek ya da örtmek için kullanılan dokuma kumaş parçası.",
    "BOL": "Yeteri kadarının üstünde, çokça bulunan; dar sözcüğünün zıttı sayılan.",
    "BORU": "İçinden su, gaz ya da başka sıvıların geçtiği içi boş uzun silindir.",
    "BOY": "İnsanın başından ayağına kadar olan uzunluğu; endam ya da kamet.",
    "BOYA": "Bir yüzeye sürüldüğünde ona istenilen rengi veren sıvı ya da toz madde.",
    "BOYUT": "Bir cismin uzunluk, genişlik ve yükseklik gibi ölçülebilen özelliği.",
    "BOŞ": "İçinde hiçbir şey bulunmayan, doluluğu olmayan kap ya da mekân.",
    "BULUT": "Gökyüzünde süzülen, su buharının yoğunlaşmasıyla oluşan beyaz küme.",
    "BURÇ": "Gökyüzündeki yıldız öbeklerinin oluşturduğu, astrolojide kullanılan imge.",
    "BUZ": "Suyun sıfır derecenin altına inerek katılaşmasıyla meydana gelen madde.",
    "BÜLBÜL": "Geceleri ötüşüyle tanınan, sesi şiirlere konu olmuş küçük kahverengi kuş.",
    "BİLEK": "Kolla eli birbirine bağlayan, küçük kemiklerden oluşan eklem bölgesi.",
    "BİLGİ": "Okuyarak, yaşayarak ya da öğrenerek elde edilen her türlü öğrenim ürünü.",
    "BİN": "Yüzlerin onunun bir araya gelmesiyle oluşan dört basamaklı sayı.",
    "BİNA": "İnsanların içinde oturduğu ya da çalıştığı, taş ve betondan yapılmış yapı.",
    "BİR": "Sayıların başlangıcı olan, tek adedi gösteren ilk doğal rakam.",
})

# --- C, Ç ---
CLUES.update({
    "CADDE": "Şehirlerde iki yanı binalarla çevrili, taşıtların geçtiği geniş ana yol.",
    "CAN": "İnsanı yaşatan soluk, ruh; bedenin yaşamını sürdürmesini sağlayan güç.",
    "CEHD": "Bir işi başarmak için gösterilen büyük çaba, gayret ve çalışma.",
    "CEP": "Pantolon ya da ceketin içine dikilmiş, ufak eşya konulan küçük kese.",
    "CEVAP": "Sorulan bir soruya ya da söylenen söze karşı verilen karşılık.",
    "CEZA": "Suç işleyen kimseye, yaptığının karşılığı olarak verilen yaptırım.",
    "ÇAKI": "Katlanabilen küçük bıçak; çoğunlukla cepte taşınan, sivri uçlu el aleti.",
    "ÇALI": "Boyu kısa, dalları sık ve odunsu olan, çok dallı bodur bitki.",
    "ÇAM": "İğne yaprakları yıl boyu yeşil kalan, kozalak veren, uzun ömürlü ağaç.",
    "ÇAN": "İçindeki dilin sallanmasıyla ses çıkaran, koni biçimli madeni araç.",
    "ÇAP": "Bir çemberin merkezinden geçerek onu iki eşit yaya bölen doğru parça.",
    "ÇARE": "Sıkıntılı ya da zor bir durumu ortadan kaldıracak çözüm yolu.",
    "ÇAY": "Demlenmiş yapraklarından içecek hazırlanan, ülkenin vazgeçilmez sıcak içkisi.",
    "ÇAĞ": "Tarihte belli özelliklerle ayırt edilen uzun dönem; devir, asır.",
    "ÇEMBER": "Bir merkezden eşit uzaklıktaki noktaların oluşturduğu kapalı eğri.",
    "ÇEVRE": "Bir alanın ya da cismin dört bir yanını saran dış sınır; etraf.",
    "ÇEŞME": "Musluğundan sürekli ya da aralıklı su akan, genellikle taştan yapılmış yapı.",
    "ÇINAR": "Geniş yaprakları ve kalın gövdesiyle yüzyıllarca yaşayabilen büyük ağaç.",
    "ÇÖL": "Yağış almadığı için kum ve kayalarla kaplı, bitkisi çok seyrek olan bölge.",
    "ÇİFT": "Birbirinin eşi olan iki şeyden oluşan takım; tekin karşıtı sayı grubu.",
    "ÇİT": "Bahçeyi ya da tarlayı çevreleyen, tahta veya telden yapılmış alçak engel.",
    "ÇİÇEK": "Bitkinin üreme organı; genellikle göz alıcı renkleri ve kokusu olan kısım.",
})

# --- D ---
CLUES.update({
    "DAL": "Bir ağacın gövdesinden yanlara doğru uzayan ve yapraklarını taşıyan kol.",
    "DAM": "Yapının üstünü kapatan, yağmurdan ve güneşten koruyan çatı kısmı.",
    "DAMA": "Siyah beyaz karelere yerleştirilen taşlarla iki kişi arasında oynanan oyun.",
    "DANS": "Müziğin ritmine uyarak, düzenli vücut hareketleriyle yapılan sanatsal eylem.",
    "DAR": "Genişliği yetersiz olan, sıkıştıran; geniş sözcüğünün karşıtı sıfat.",
    "DARBE": "Ani ve sert bir hareketle yapılan vuruş; çarpma sonucu alınan sarsıntı.",
    "DAVA": "Bir hakkı aramak için mahkemeye başvurularak açılan hukuki süreç.",
    "DAĞ": "Çevresine göre belirgin biçimde yükselen, taşlık ve kayalık büyük arazi.",
    "DEFA": "Bir olayın kaçıncı kez yaşandığını anlatmak için kullanılan kez sözcüğü.",
    "DENEY": "Bir varsayımı doğrulamak amacıyla yapılan, kontrollü bilimsel çalışma.",
    "DENİZ": "Kıtaları birbirinden ayıran, tuzlu sulardan oluşan uçsuz bucaksız kütle.",
    "DEPREM": "Yer kabuğunun kırılmasıyla meydana gelen, yüzeyi sarsan doğal olay.",
    "DERE": "Dağlardan doğan, ırmağa ya da göle dökülen küçük doğal akarsu.",
    "DERT": "İnsanı üzen, iç sıkıntısı veren; uzun süre geçmeyen tasa ve keder.",
    "DERUN": "Bir şeyin iç tarafı; gönlün ya da yüreğin en derin, gizli yeri.",
    "DEVAM": "Bir işi ya da durumu ara vermeden sürdürme, aksatmadan götürme hali.",
    "DEVE": "Sırtında hörgücü bulunan, çölde uzun süre susuzluğa dayanabilen büyük hayvan.",
    "DEVLET": "Belirli bir ülkenin sınırlarında örgütlenmiş siyasi ve yönetimsel yapı.",
    "DIŞ": "İçin karşıtı; bir şeyin çevresini gören, dışarıya bakan yüzü.",
    "DOLAP": "İçine giysi, kap kacak ya da eşya konulan, kapaklı büyük mobilya.",
    "DOLU": "İçi boşluk bırakmayacak biçimde bir şeyle tamamen kaplanmış olan.",
    "DON": "Havanın ısısının düşmesiyle suların yüzeyde buz tutması olayı.",
    "DOST": "Kötü günde de yanında olan, gönülden sevilen yakın arkadaş.",
    "DUŞ": "Üstten sıkılan su ile yıkanmak üzere banyoya yerleştirilmiş düzenek.",
    "DÖN": "Bulunduğun yerden geri çevril; ya da bir eksen etrafında hareket et.",
    "DÖRT": "Üçten sonra gelen, mevsim ve yön sayısına denk gelen doğal sayı.",
    "DÜDÜK": "İçine üflenince tiz bir ses çıkaran, ince ve boru biçimli küçük alet.",
    "DÜNYA": "Üzerinde yaşadığımız, Güneş'in çevresinde dönen mavi yeşil gezegen.",
    "DÜŞ": "Uyku sırasında zihnin canlandırdığı görüntüler ya da uyanıkken kurulan hayal.",
    "DİL": "Ağız içindeki kaslı organ; aynı zamanda insanların konuşarak anlaştığı sistem.",
    "DİŞ": "Ağızda bulunan, yiyecekleri kopartıp öğütmeye yarayan sert beyaz yapı.",
})

# --- E ---
CLUES.update({
    "ECEL": "Her canlı için önceden belirlendiğine inanılan ölüm zamanı.",
    "ECİR": "Yapılan iyiliğin ya da çekilen sıkıntının karşılığı olarak verilen sevap.",
    "EDEP": "Görgü kurallarına uygun davranış; terbiyeli ve ölçülü olma hali.",
    "EFSANE": "Kuşaktan kuşağa sözlü aktarılan, olağanüstü öğelerle süslenmiş hikâye.",
    "EKMEK": "Undan mayalanıp fırında pişirilerek yapılan, sofranın temel besini.",
    "ELEM": "Gönle çöken derin üzüntü, insanı içten içe yiyen keder.",
    "ELMA": "Kabuğu kırmızı, sarı ya da yeşil olabilen, sulu ve çıtır meyve.",
    "ELMAS": "Doğada bulunan en sert madde; takılarda kullanılan değerli kıymetli taş.",
    "EMEL": "Kavuşulması için yıllarca beklenen, gönülde taşınan büyük istek.",
    "EMİR": "Yetkili bir kimsenin yerine getirilmek üzere verdiği kesin buyruk.",
    "ERKEN": "Belirlenen vaktin öncesinde gelme; geç kalmanın tersi durumu.",
    "ESER": "Bir sanatçının ya da yazarın ortaya koyduğu özgün yapıt.",
    "EZEL": "Başlangıcı bulunmayan, öncesi olmayan sonsuz geçmiş zaman.",
    "EĞE": "Metal ya da tırnak gibi sert yüzeyleri aşındırarak düzelten dişli alet.",
    "EŞEK": "Uzun kulaklı, sabırlı; köylerde yük taşımada kullanılan küçük binek hayvanı.",
    "EŞYA": "Evde ya da iş yerinde gündelik hayatta kullanılan nesnelerin tümü.",
})

# --- F ---
CLUES.update({
    "FARE": "Dişleri sürekli uzayan, tahtayı ve kâğıdı kemirebilen küçük kemirgen.",
    "FARK": "İki şeyin birbirinden ayrıldığı yön; aralarındaki benzemezlik.",
    "FARZ": "Dinde kesinlikle yerine getirilmesi emredilen, zorunlu olan yükümlülük.",
    "FENA": "Niteliği kötü olan, insanın içini bunaltan; iyi sözcüğünün zıttı.",
    "FIRAK": "Birbirinden ayrı düşen sevgililerin yaşadığı acı dolu ayrılık.",
    "FOTON": "Işığı oluşturan, kütlesiz ve enerjili en küçük temel parçacık.",
    "FUTBOL": "Her takımdan on bir oyuncunun sahada top üzerinde oynadığı dünya sporu.",
    "FİGAN": "Dayanılmaz acı anında yükselen yüksek sesli ağlama ve feryat.",
    "FİL": "Hortumuyla tanınan, kulakları iri, kara hayvanlarının en büyüklerinden biri.",
    "FİZİK": "Maddenin, enerjinin ve bunların birbirleriyle etkileşiminin bilimi.",
})

# --- G ---
CLUES.update({
    "GAFİL": "Çevresinde olanlardan haberi olmayan, dalgın ve dikkatsiz kimse.",
    "GAYE": "Bir işe girişirken göz önünde tutulan, ulaşılmak istenen son hedef.",
    "GAYR": "Bundan başka, farklı; bir şeyin dışında kalan diğer kısım.",
    "GAZ": "Belli bir şekli ve hacmi olmayan, her yöne yayılabilen madde hali.",
    "GECE": "Güneşin batmasından doğmasına kadar süren karanlık zaman dilimi.",
    "GEL": "Bulunduğun yerden buraya doğru yaklaş; git sözcüğünün tam zıttı eylem.",
    "GEMİ": "Denizde yük ya da yolcu taşımak için yapılmış büyük su taşıtı.",
    "GEN": "Kalıtsal özellikleri taşıyan, DNA üzerinde yer alan kalıtım birimi.",
    "GERİ": "İlerinin zıttı; arkaya ya da başlangıca doğru olan yön.",
    "GÖL": "Karayla çevrili, deniz bağlantısı olmayan geniş durgun su birikintisi.",
    "GÖLET": "Küçük bir vadiye set çekerek oluşturulan, sulamada kullanılan yapay havuz.",
    "GÖLGE": "Işığın önüne bir cisim girince arkasında oluşan karanlık alan.",
    "GÖMLEK": "Yakalı, düğmeli ve kollu olan, üstten giyilen ince kumaş giysi.",
    "GÖZ": "Yüzümüzde çift olarak bulunan, etrafımızı görmemizi sağlayan duyu organı.",
    "GÜL": "Dikenli gövdesi ve hoş kokulu taç yapraklarıyla bilinen bahçe çiçeği.",
    "GÜN": "Yirmi dört saate denk gelen; sabahtan akşama uzanan zaman dilimi.",
    "GÜNDEM": "Bir toplantıda ya da günde ele alınacak konuların sıralı listesi.",
    "GÜÇ": "Bir işi yapabilme yeteneği; fiziksel ya da manevi olarak sahip olunan kuvvet.",
    "GİT": "Bulunduğun yerden uzaklaşarak başka bir yere doğru yönel; gel'in zıttı.",
    "GİTAR": "Altı teli olan, parmakla ya da mızrapla çalınan telli müzik aleti.",
})

# --- H ---
CLUES.update({
    "HABER": "Bir olay ya da gelişme hakkında ulaşan yeni bilgi; duyuru.",
    "HAK": "Kişinin yasal olarak sahip olduğu; alması ya da yapması gereken şey.",
    "HAKEM": "Sporda kuralların uygulanmasını denetleyen, karar veren yetkili kişi.",
    "HAL": "Bir kimsenin ya da şeyin bulunduğu durum, vaziyet ya da keyif.",
    "HANE": "Bir ailenin oturduğu ev; aynı zamanda sayıdaki basamak anlamı taşır.",
    "HASRET": "Uzakta olan bir sevgiliyi ya da yeri özlemenin içe işleyen duygusu.",
    "HASTANE": "Doktorların çalıştığı, hastaların tedavi edildiği büyük sağlık kurumu.",
    "HAT": "Bir noktadan diğerine uzanan düz çizgi; yol ya da güzergâh.",
    "HATA": "İstemeden yapılan yanlış; doğru olandan sapmanın yol açtığı kusur.",
    "HAVA": "Atmosferi oluşturan, canlıların soluduğu renksiz ve kokusuz gaz karışımı.",
    "HAYA": "Ayıp sayılan bir şey karşısında insanın yüzünü kızartan çekinme duygusu.",
    "HAYAL": "Zihinde canlandırılan, gerçekleşmesi beklenen ya da umulan görüntü.",
    "HAZİNE": "Değerli eşyaların ya da paraların saklandığı gizli büyük birikim.",
    "HECE": "Bir kelimeyi bir nefeste söyleyebildiğimiz en küçük ses birimi.",
    "HESAP": "Sayılarla yapılan dört işlem; gelir ve giderin tutulduğu kayıt.",
    "HOŞ": "İnsanın yüzünü gülümseten, göze güzel gelen; beğenilen durum.",
    "HULUS": "İçten gelen bağlılık; gönülden duyulan samimi sevgi ve sadakat.",
    "HUZUR": "İç sıkıntısının olmadığı, gönlün rahat ettiği dingin ruh hali.",
    "HİCAP": "Uygunsuz bir durumda duyulan utanç; insanın yüzünü gizleme isteği.",
    "HİCRAN": "Sevgiliden uzak düşmenin yürekte açtığı derin ayrılık acısı.",
    "HİKAYE": "Başı, ortası ve sonu olan; yaşanmış ya da kurmaca kısa anlatı.",
    "HİLE": "Birini aldatmak için yapılan gizli düzen; dolap çevirme.",
    "HİSSE": "Ortak bir malın ya da işin her birine düşen pay; nasip.",
    "HİÇ": "Olumsuzluğu pekiştiren söz; asla ve kesinlikle bulunmama durumu.",
})

# --- I, İ ---
CLUES.update({
    "IRMAK": "Kollarını yan derelerden alan, denize ya da göle dökülen büyük akarsu.",
    "ISLAK": "Su veya başka bir sıvıyla temas edip kurumamış olan nemli yüzey.",
    "IŞIN": "Bir kaynaktan doğrusal yönde yayılan ışık ya da enerji demeti.",
    "İDRAK": "Bir şeyin anlamını kavrama; olup biteni zihinde anlamlandırma yeteneği.",
    "İFFET": "Ahlaki ölçülere bağlı kalma; namusu ve temizliği koruma hali.",
    "İKBAL": "Hayatta yükselme, talih kuşunun başa konması; mevki sahibi olma.",
    "İLAM": "Mahkemenin verdiği kararı bildiren, yazılı resmi belge.",
    "İLAÇ": "Hastalıkları iyileştirmek amacıyla hazırlanan, doktor tarafından verilen madde.",
    "İLHAM": "Sanatçının ya da düşünürün içine birden doğan yaratıcı esin kaynağı.",
    "İLK": "Bir sıranın en başında bulunan; sondan önce hiçbir şey olmayan sırada birinci.",
    "İMAN": "Din esaslarına yürekten bağlanma; kalben kabul edip inanma hali.",
    "İNCE": "Kalınlığı az olan; zarif ve narin yapıda bulunan; kalının karşıtı.",
    "İPEK": "Kozadan elde edilen, parlak dokulu ve dayanıklı, değerli kumaş lifi.",
    "İRFAN": "Bilginin ötesinde, deneyim ve sezgiyle kazanılan derin anlayış.",
    "İSTANBUL": "İki yakası boğazla ayrılan, Asya ile Avrupa'yı buluşturan büyük şehir.",
    "İYİ": "Hoşa giden, yararlı ve olumlu olan; kötünün tam karşıtı olan nitelik.",
    "İZAH": "Anlaşılmayan bir konuyu açık bir dille anlatma; aydınlatıcı açıklama.",
    "İĞNE": "Ucu sivri, arkası delikli; dikiş dikmek için ipliği geçiren ince metal araç.",
})

# --- K ---
CLUES.update({
    "KADER": "İnsanın başına geleceği önceden yazıldığına inanılan alın yazısı.",
    "KAFA": "İnsanın boynunun üst kısmında bulunan, düşünmenin merkezi olan baş.",
    "KAL": "Gitme, olduğun yerde dur; git sözcüğünün tam karşıtı olan emir.",
    "KALE": "Eskiden şehirleri düşmandan korumak için yapılmış yüksek surlu savunma yapısı.",
    "KALEM": "Ucundan mürekkep ya da grafit akıtarak kâğıda yazı yazmayı sağlayan araç.",
    "KAMYON": "Uzun kasasında büyük yükler taşıyan, dört tekerlekten fazlası olan taşıt.",
    "KAN": "Damarlarda dolaşarak vücuda oksijen taşıyan kırmızı renkli canlı sıvı.",
    "KANAAT": "Elinde olanla yetinip daha fazlasını istememe; tokgözlülük hali.",
    "KAP": "İçine sıvı ya da katı maddeler konulan her türlü şekilli eşya.",
    "KAR": "Soğuk havada bulutlardan düşen, altıgen kristallerden oluşan beyaz yağış.",
    "KARA": "Beyazın tam zıttı olan, gölgeleri bile koyulaştıran siyah ton.",
    "KARINCA": "Sürüler halinde yaşayan, küçük gövdesine rağmen iri yükleri taşıyan böcek.",
    "KART": "İnce mukavvadan yapılmış, üzerine yazı yazılan ya da baskı yapılan levha.",
    "KARTAL": "Geniş kanatlarıyla yükseklerde süzülen, keskin gözlü yırtıcı büyük kuş.",
    "KASE": "Çorba, salata ya da yoğurt konulan, yuvarlak ve çukur küçük yemek kabı.",
    "KAT": "Bir binanın birbirinin üzerine gelen yatay bölümlerinden her biri.",
    "KAYA": "Toprağın üstünde ya da altında bulunan, kolay parçalanmayan büyük taş.",
    "KAZI": "Toprağın altında kalmış eski eserleri çıkarmak için yapılan eşme işi.",
    "KAŞ": "Gözün hemen üstünde bulunan, yaklaşık yay biçimindeki kıl kümesi.",
    "KAŞIK": "Çorba, pilav gibi yemekleri ağza götürmek için kullanılan çukur sap.",
    "KEDER": "İnsanın içini burkan, uzun süre geçmeyen derin üzüntü hali.",
    "KEDİ": "Miyavlayarak seslenen, pençeleri keskin, evlerde beslenen tüylü memeli hayvan.",
    "KELAM": "Ağızdan çıkan söz; düşüncenin dille ifade bulmuş hali.",
    "KELEBEK": "Tırtılken metamorfoz geçirip renkli kanatlara kavuşan zarif böcek.",
    "KEMAL": "Bir şeyin eksiksiz, kusursuz ve en üst düzeyde olgunlaşmış hali.",
    "KENAR": "Bir yüzeyin ya da nesnenin dış sınırını oluşturan uç bölüm.",
    "KENT": "Nüfusu kalabalık, altyapısı gelişmiş, şehir niteliğindeki yerleşim yeri.",
    "KIRA": "Bir evin ya da iş yerinin kullanımı için sahibine ödenen aylık ücret.",
    "KISMET": "Kişinin payına düşen; kaderin ona uygun gördüğü nasibi ya da şansı.",
    "KIŞ": "Yılın en soğuk, en karlı ve gündüzlerin en kısa olduğu dört mevsimden biri.",
    "KOKU": "Burnumuzla algıladığımız, havada yayılan hoş ya da keskin tanecikler.",
    "KOL": "Omuzdan bileğe kadar uzanan, eli bedene bağlayan üst uzvumuz.",
    "KOR": "Alevi sönmüş ama sıcaklığı ve kızıllığı süren yanmakta olan parça.",
    "KOVA": "Kulpundan tutularak su ya da başka sıvı taşınan derin silindirik kap.",
    "KUARK": "Proton ve nötronların yapı taşı sayılan temel parçacıklardan biri.",
    "KUDRET": "Bir işi yapabilme gücü; insanda ya da doğada bulunan büyük kuvvet.",
    "KUKLA": "İp ya da parmaklarla oynatılan, tiyatro sahnesinde canlanan figürlü bebek.",
    "KULE": "Çevresindeki yapılardan çok daha yüksek olan, dar ve uzun yapı.",
    "KUPA": "Bir yarışmanın galibine ödül olarak verilen, ayaklı madeni kadeh.",
    "KURAL": "Bir düzen içinde hareket edebilmek için uyulması zorunlu olan ilke.",
    "KUTU": "İçine eşya konulan, çoğu zaman kapağı olan, dikdörtgen ya da kare biçimli hazne.",
    "KUĞU": "Uzun beyaz boynuyla su yüzeyinde zarafetle süzülen büyük göl kuşu.",
    "KUŞ": "Gövdesi tüylerle kaplı, kanatları yardımıyla uçabilen yumurtlayan canlı.",
    "KÖPEK": "İnsana sadakatiyle bilinen, havlayarak seslenen evcil dört ayaklı.",
    "KÖPRÜ": "Bir nehrin ya da vadinin iki yakasını birbirine bağlayan geçit yapısı.",
    "KÖŞE": "İki duvarın ya da iki kenarın birleştiği noktada oluşan açılı yer.",
    "KÜL": "Bir şeyin yanıp bitmesinin ardından geriye kalan kurumuş toz madde.",
    "KİL": "Çanak çömlek yapımında kullanılan, suyla yumuşayan yapışkan toprak.",
    "KİRAZ": "Saplı, parlak, kırmızı kabuklu; ilkbaharın sonunda olgunlaşan tatlı meyve.",
    "KİTAP": "Sayfalardan oluşan, üzerine bilgi ya da hikâye yazılmış ciltli eser.",
})

# --- L ---
CLUES.update({
    "LALE": "İlkbaharda açan, kadeh biçimli taç yaprakları olan, Türklerin simgesi çiçek.",
    "LAMBA": "İçindeki ampulle çalışan, karanlık odayı aydınlatan elektrikli araç.",
    "LATİF": "Göze ve gönle hoş gelen, nazik ve yumuşak huylu; incelikli olan.",
    "LAZER": "Dar bir demet halinde yoğunlaştırılmış, tek dalga boyunda güçlü ışık.",
    "LÜTUF": "Karşılık beklemeden yapılan iyilik; bir büyüğün bahşettiği ihsan.",
    "LİMAN": "Gemilerin yük boşalttığı, fırtınadan korunarak demirlediği deniz kıyısı.",
    "LİRA": "Türkiye Cumhuriyeti'nin resmi para birimi; TL kısaltmasıyla yazılan değer.",
    "LİSAN": "Bir milletin kuşaklar boyunca konuşup yazdığı ortak iletişim dizgesi.",
})

# --- M ---
CLUES.update({
    "MAHLAS": "Sanatçıların, özellikle şairlerin gerçek adları yerine kullandığı takma ad.",
    "MAHZUN": "Gözleri dalgın, içinde sessiz bir keder taşıyan; hüzünlü görünüşlü.",
    "MAHŞER": "Dinde kıyamet sonrası ölülerin toplanacağına inanılan büyük buluşma yeri.",
    "MAL": "Sahip olunan taşınır ya da taşınmaz değerli eşya; mülk.",
    "MANA": "Bir sözcüğün ya da cümlenin ardında yatan anlam; içerdiği kavram.",
    "MASA": "Üzerinde yemek yemek ya da çalışmak için kullanılan ayaklı düz mobilya.",
    "MASAL": "Hayal ürünü kahramanların yer aldığı, 'bir varmış bir yokmuş'la başlayan öykü.",
    "MATEM": "Kaybedilen bir yakının ardından tutulan koyu yas; siyahlar giyme hali.",
    "MAZİ": "Geride kalan zaman; yaşanmış olayların artık değiştirilemeyen bölümü.",
    "MAŞA": "Sobadan ateş almak ya da sıcak şeyleri tutmak için kullanılan uzun kıskaç.",
    "MEFTUN": "Birisine ya da bir şeye tutkuyla vurulmuş, hayran kalmış kimse.",
    "MEKAN": "Bir olayın geçtiği ya da bir şeyin bulunduğu belirli yer; mahal.",
    "MELAL": "İçe işleyen hafif hüzün; kimseye belli edilmeyen sessiz usanç.",
    "MELEK": "Dinlerde iyilikle görevlendirilmiş, kanatlı olduğuna inanılan kutsal varlık.",
    "MERA": "Hayvanların otlayıp beslenmesi için ayrılmış, doğal otlarla kaplı geniş alan.",
    "MERAK": "Bilinmeyen bir şeyi öğrenmek için insanın içine düşen güçlü istek.",
    "MERAM": "Gönülde beslenen amaç; ulaşılmak istenen iç istek.",
    "MERKEZ": "Bir dairenin ya da bir alanın tam ortasında bulunan ana nokta.",
    "MEVKİ": "Bir kimsenin toplumdaki yeri, konumu ya da makamı.",
    "MEYVE": "Bitkinin çiçeğinin olgunlaşmasıyla oluşan, genellikle yenilebilir ürün.",
    "MEZAR": "Ölünün toprağa verildiği, başında taş bulunan defin yeri; kabir.",
    "MOLA": "Çalışmaya ya da yolculuğa kısa bir süre ara vererek dinlenme anı.",
    "MOR": "Kırmızı ile mavinin karışımından elde edilen, menekşe renginde koyu ton.",
    "MUAMMA": "Çözülmesi zor olan gizemli durum; içinden çıkılmaz sır.",
    "MUM": "Fitilinden yakıldığında eriyerek ortamı aydınlatan silindir biçimli cisim.",
    "MUNİS": "Yumuşak huylu, kolay geçinilen; sert tavır göstermeyen uysal kimse.",
    "MUZ": "Sarı kabuklu, uzun, yumuşak iç gövdeli tropikal meyve.",
    "MÜJDE": "Sevinçle karşılanan, umut veren yeni gelen güzel haber.",
    "MÜZİK": "Seslerin belli bir düzen içinde bir araya getirilmesiyle oluşan sanat.",
    "MİLAT": "Bir sürecin başladığı; sıfırdan hesaplandığı başlangıç tarihi.",
    "MİSAL": "Anlatılanı somutlaştırmak için verilen örnek; kıyas noktası.",
})

# --- N ---
CLUES.update({
    "NAFİLE": "Harcanan çabaya değmeyen; hiçbir yarar sağlamayan boş uğraş.",
    "NAKİL": "Bir şeyin bir yerden başka bir yere taşınması; aktarma işlemi.",
    "NANE": "Serinletici kokusuyla tanınan, çaya ve yemeklere katılan yeşil yapraklı ot.",
    "NAR": "İçi kırmızı tanelerle dolu, kalın kabuklu, sonbahar aylarının meyvesi.",
    "NAZ": "Sevdiğine karşı gösterilen hafif cilve; yapmacık çekingenlik.",
    "NAZAR": "Kötü bakışın bir kimseye uğursuzluk getireceğine duyulan halk inancı.",
    "NAZİK": "Kırıcı olmayan, incelikli davranışları olan; kibar ve görgülü kimse.",
    "NAĞME": "Bir ezginin kulağa hoş gelen melodik sesi; tiz tatlı tını.",
    "NEFES": "Ciğerlere hava çekmek ve bırakmak; yaşamın sürdüğünün göstergesi soluk.",
    "NEHİR": "Birçok dereyi içine alarak denize ulaşan, uzun ve geniş tatlı su yolu.",
    "NEM": "Havada ya da bir yüzeyde bulunan, hissedilen rutubet miktarı.",
    "NEZİH": "Her türlü çirkinlikten uzak duran; temiz ahlaklı ve arı kimse.",
    "NOKTA": "Bir cümlenin sonuna konan en küçük yazı işareti; konumun kendisi.",
    "NOTA": "Müzik eserlerinde seslerin yükseklik ve uzunluğunu gösteren küçük simge.",
    "NÜKTE": "Dinleyeni güldüren ince espri; zarif bir ustalıkla söylenmiş söz.",
    "NİDA": "Birine seslenmek için çıkarılan yüksek ses; çağırmak amaçlı bağırma.",
    "NİMET": "Yararlanılan, şükür duyulan değerli varlık; insana verilmiş lütuf.",
    "NİYAZ": "Alçakgönüllülükle yapılan yalvarış; Tanrı'dan dilenen istek.",
})

# --- O, Ö ---
CLUES.update({
    "ODA": "Bir evin ya da binanın duvarlarla ayrılmış, belirli amaçla kullanılan bölümü.",
    "OKUL": "Öğrencilerin öğretmenler tarafından eğitim aldığı resmî öğretim kurumu.",
    "ORDU": "Bir ülkenin savunmasını üstlenen, askerlerden oluşan silahlı kuvvetler.",
    "ORGAN": "Vücudun belirli bir işlevi yerine getiren, dokulardan oluşmuş bölümü.",
    "ORMAN": "Geniş bir alana yayılmış, iç içe büyümüş ağaçlardan oluşan doğal yaşam.",
    "OTEL": "Yolcuların ücret karşılığı geceyi geçirdiği, odaları olan konaklama işletmesi.",
    "OTOBÜS": "Şehir içinde ya da dışında birçok yolcuyu bir arada taşıyan büyük araç.",
    "OYA": "İğne ya da tığla işlenen, başörtüsü kenarını süsleyen ince el işi.",
    "OYUN": "Boş zamanlarda eğlence ya da öğrenme amacıyla kurallara göre oynanan etkinlik.",
    "ÖDEV": "Öğretmenin evde yapılmak üzere öğrenciye verdiği görev; yerine getirilmesi gereken iş.",
    "ÖDÜL": "Başarı gösteren kimseye, çabasının karşılığı olarak verilen değerli armağan.",
    "ÖMÜR": "Bir canlının doğumundan ölümüne kadar geçen toplam yaşam süresi.",
    "ÖRTÜ": "Bir eşyanın ya da yüzeyin üstünü kapatmak için serilen kumaş parçası.",
})

# --- P ---
CLUES.update({
    "PAKET": "İçindeki eşyayı korumak için ambalajlanmış, kâğıt ya da karton sargılı koli.",
    "PAPATYA": "Sarı göbeğinin etrafında beyaz taç yapraklarıyla açan küçük kır çiçeği.",
    "PARK": "Şehir içinde insanların dinlenip yürüdüğü, ağaçlıklı kamusal yeşil alan.",
    "PAS": "Demirin hava ve nemle temas ederek zamanla üzerinde oluşturduğu kızıl tabaka.",
    "PASTA": "Kat kat hamuru kremayla birleştirilen, doğum günlerinde kesilen tatlı.",
    "PERDE": "Pencereyi örtmek için asılan, ışığı ve dışarıdan görünmeyi engelleyen kumaş.",
    "PLAJ": "Denizin kıyısındaki kumluk alan; insanların yüzüp güneşlendiği sahil.",
    "PLAZMA": "Katı, sıvı ve gazdan sonra gelen, iyonlaşmış maddenin dördüncü hali.",
    "POSTA": "Mektup ve paketlerin toplanıp yerine ulaştırıldığı geleneksel iletişim hizmeti.",
    "PUAN": "Bir sınavda ya da yarışmada başarıya göre verilen sayısal değerlendirme.",
    "PUL": "Mektupların üzerine yapıştırılan, postanın ücretini belgeleyen küçük kâğıt.",
    "PİDE": "Fırında pişirilen, üstüne malzeme serilen, ince ve yassı hamur işi.",
    "PİLOT": "Havada uçağı yöneten, onu kalkış ve inişlerde kullanan yetişmiş kişi.",
})

# --- R ---
CLUES.update({
    "RADAR": "Radyo dalgalarını yollayıp yansımasını ölçerek uzaktaki nesneleri belirleyen sistem.",
    "RAKİP": "Aynı amaca ulaşmak için karşı karşıya gelen, yarış halindeki hasım.",
    "RAST": "Birinin ya da bir şeyin beklemediğin anda karşına çıkması; tesadüf.",
    "REFAH": "Geçim sıkıntısı çekmeden, bolluk içinde sürdürülen rahat ve huzurlu yaşam.",
    "REHAVET": "Kasları çözülmüş gibi hissettiren ağır gevşeklik; uyuşukluk hali.",
    "ROBOT": "Programlanarak belirli işleri otomatik yapan mekanik insansı makine.",
    "RUH": "İnsanın bedenine hayat veren, duygularının ve düşüncelerinin kaynağı manevi öz.",
    "RÜYA": "Uykuda iken zihnin sahneler halinde canlandırdığı renkli görüntüler.",
    "RİCA": "Birinden nazikçe bir şey istemek; kibarca dile getirilen dilek.",
    "RİYA": "İnanmadığı halde inanıyormuş gibi davranma; iki yüzlü tavır.",
})

# --- S, Ş ---
CLUES.update({
    "SAAT": "Akrep, yelkovan ve rakamlarla anı gösteren; zamanı ölçen günlük araç.",
    "SABAH": "Güneşin doğmasıyla başlayıp öğleye kadar süren günün ilk dilimi.",
    "SABIR": "Zorluklara dayanıp isyan etmeden bekleyebilme; hoşgörü ile katlanma.",
    "SABUN": "Cilde sürülüp suyla köpürtülerek kirleri temizleyen, kalıp ya da sıvı madde.",
    "SADA": "Uzaktan duyulan insan ya da doğa sesi; boğumlu ses dalgası.",
    "SADAKAT": "Sevdiğine ya da inandığına ömür boyu bağlı kalma; vefa göstermek.",
    "SAFA": "İçten duyulan gönül rahatlığı; keder bırakmayan tatlı neşe.",
    "SAHİL": "Denizin ya da gölün karaya kavuştuğu kumlu ve taşlı kıyı şeridi.",
    "SALON": "Evin misafir ağırlanan en büyük odası ya da toplantı yapılan geniş mekân.",
    "SANDAL": "İnsan ya da kürek gücüyle suda yol alan küçük açık deniz teknesi.",
    "SANİYE": "Dakikanın altmışta biri; zamanın en küçük günlük ölçü birimi.",
    "SAP": "Bitkinin çiçek ya da yaprağını gövdeye bağlayan uzun ve ince bölüm.",
    "SARAY": "Padişah veya hükümdarların oturduğu, görkemli mimarisi olan büyük yapı.",
    "SARI": "Limon ve altın tonlarında olan, güneşi çağrıştıran canlı sıcak renk.",
    "SAYI": "Bir miktarı ya da sırayı belirten; rakamlarla yazılan matematik kavramı.",
    "SAÇ": "Başımızın derisinde biten, her birinin kökten uzayan ince tel kıl.",
    "SEBZE": "Mutfağa giren, bitki kökleri ve yapraklarından oluşan yenilebilir besin.",
    "SELAM": "Birbirini gören iki kişinin hal hatır sormak için söylediği esenlik dileği.",
    "SEMA": "Başımızın üstünde uzanan mavi kubbe; yıldızları barındıran gökyüzü.",
    "SERA": "İçerisi camla kaplı; mevsim dışında bile bitki yetiştirilen ısıtılmış yapı.",
    "SERAP": "Çölde ya da sıcakta gerçekte olmayan bir görüntü olarak algılanan yanılsama.",
    "SES": "Kulağımıza ulaşan her türlü titreşim; konuşma ve müziğin temeli.",
    "SEVDA": "Yüreği saran, insanı kendinden geçiren güçlü aşk ve tutku.",
    "SIR": "Başkalarıyla paylaşılmayan; yalnızca bir kişinin bildiği gizli bilgi.",
    "SOL": "Kalbin bulunduğu taraf; sağın tam karşıtı olan yön.",
    "SON": "Bir işin ya da sürecin bittiği nokta; final ve kapanış anı.",
    "SORU": "Bilinmeyen bir bilgiyi öğrenmek için karşıya yöneltilen cümle.",
    "SOY": "Bir kişinin atalarından gelen kan bağı; aile kökeni ve nesli.",
    "SUKUT": "Etraf çınlayarak susma; hiçbir ses çıkmayan derin sessizlik.",
    "SÜRE": "Bir olayın başlangıcı ile sonu arasında geçen zaman aralığı.",
    "SÜT": "İnek, keçi gibi memelilerden sağılan; beyaz renkli besleyici temel içecek.",
    "ŞAFAK": "Güneş doğmadan önce ufukta beliren kızıllık; günün en erken aydınlığı.",
    "ŞAL": "Omuzlara atılan ya da başa örtülen, yumuşak geniş kumaş parçası.",
    "ŞAN": "Yaptıklarıyla uzaklarda bile tanınıp bilinir olmanın verdiği büyük ün.",
    "ŞANS": "İnsana gülen talih; iyi bir sonucun tesadüfen kısmet olması hali.",
    "ŞATO": "Ortaçağ Avrupası'nda soyluların yaşadığı kuleli, büyük taştan yapılı konak.",
    "ŞEF": "Bir ekibin başında bulunup işleri yöneten kişi; mutfağın baş aşçısı.",
    "ŞEFKAT": "Zayıfa ve çaresize duyulan içten sevgi; acıyarak sarılma duygusu.",
    "ŞEKER": "Kamıştan ya da pancardan elde edilen; çay ve tatlılara katılan tatlı madde.",
    "ŞEREF": "Toplumun kişiye duyduğu saygı; alnı ak olma halinin verdiği onur.",
    "ŞEVK": "İçten doğan büyük istek; insanı coşturan şiddetli arzu ve heves.",
    "ŞÖHRET": "Herkesin duyup tanıdığı; adını çevresinin çok ötesine taşıyan ün.",
})

# --- T ---
CLUES.update({
    "TABAK": "Yemeklerin servis edildiği, yuvarlak ve yassı porselen ya da cam kap.",
    "TABİ": "Bir kurala, şahsa ya da düzene bağlı olan; ona uymak durumunda kalan.",
    "TAKDİR": "Bir kişinin emeğini ya da başarısını görüp açıkça beğenip övme.",
    "TALEP": "Bir kimsenin bir şey için yaptığı istek; dile getirilen açık dilek.",
    "TALİH": "İnsanın ömür boyu karşılaştığı iyi ya da kötü raslantıların tümü; baht.",
    "TANE": "Sayılabilen nesnelerin her biri; küçük parça ya da adet.",
    "TARLA": "Üzerinde buğday, arpa ya da sebze yetiştirilen sürülmüş geniş toprak.",
    "TARZ": "Bir kişinin ya da akımın kendine özgü yapma biçimi; üslup.",
    "TAT": "Dilin damak aracılığıyla algıladığı; acı, ekşi, tuzlu gibi duyusal nitelik.",
    "TAVLA": "Zarla ve pullarla iki kişi arasında oynanan, kahvehane kültürünün oyunu.",
    "TAZE": "Yeni toplanmış, bayatlamamış; canlılığını yeni yeni yitirmemiş olan.",
    "TAŞ": "Toprağın içinden çıkan, sert ve ağır olan doğal kayaç parçası.",
    "TECELLİ": "Gizli kalmış bir şeyin zamanı gelince gözle görünür olması; belirme.",
    "TEESSÜR": "Acıklı bir olay karşısında insanın içine çöken derin hüzün.",
    "TEKNE": "Yelkenli ya da motorlu olup denizde kısa yolculuklara çıkan küçük gemi.",
    "TELAŞ": "Beklenmedik bir durum karşısında gösterilen aceleci ve tedirgin hal.",
    "TELEFON": "Uzaktaki kişilerle anında sesli iletişim kurmamızı sağlayan cihaz.",
    "TEMEL": "Bir yapının ayakta durmasını sağlayan, toprağa gömülü olan ilk bölümü.",
    "TEN": "İnsanın bedenini saran dış deri; vücudumuzun dış yüzü.",
    "TENHA": "İnsanın pek rastlanmadığı, sessiz ve ıssız kalmış mekân.",
    "TEPE": "Dağdan daha alçak, çevresine göre yüksek görünen küçük yükselti.",
    "TESELLİ": "Üzüntülü birine söylenerek onu rahatlatan sıcak avutucu söz.",
    "TEVAZU": "Kendini üstün görmeyen, sade ve mütevazı davranış; gösterişsiz olma hali.",
    "TIP": "Hastalıkların tanısı ve iyileştirilmesiyle uğraşan hekimlik bilim dalı.",
    "TOKA": "Saçı ya da kemeri tutturmaya yarayan, klips gibi açılıp kapanan küçük süs.",
    "TON": "Bin kilograma eşit olan büyük ağırlık ölçü birimi.",
    "TOST": "Ekmeğin arasına peynir konup ısıtılarak kızartılan sandviç çeşidi.",
    "TOZ": "Havada uçuşan ya da yüzeyde biriken, çok küçük katı parçacıklar.",
    "TREN": "Raylar üzerinde hareket eden, vagonları çeken büyük motorlu araç.",
    "TUZ": "Denizden ya da yer altından çıkarılan; yemeklere tat veren beyaz tane.",
    "TÜR": "Aynı ortak özellikleri taşıyan canlıların oluşturduğu sınıflama birimi.",
    "TÜRK": "Anadolu ve çevresinde yaşayan, Orta Asya kökenli büyük millet.",
})

# --- U, Ü ---
CLUES.update({
    "ULU": "Yüceliğiyle saygı uyandıran; hem büyük hem görkemli olan varlık.",
    "ULVİ": "Maddi olanın üstünde, manevi değerlerle ilgili; kutsal niteliği bulunan.",
    "USUL": "Bir işin belirli kurallar içinde yapılmasını sağlayan yol; yöntem.",
    "UZAK": "Aradaki mesafenin çok olduğu; yakınlığı hissedilmeyen ötelerdeki yer.",
    "UZAY": "Gök cisimlerini barındıran, Dünya atmosferinin ötesindeki sonsuz boşluk.",
    "UÇAK": "Kanatları sayesinde havalanıp gökyüzünde uçan motorlu büyük taşıt.",
})

# --- V ---
CLUES.update({
    "VADİ": "İki dağın arasında kalan; genellikle içinden dere akan uzun çukur alan.",
    "VAHİM": "Sonu kötü olabilecek; durumun ne kadar ağır olduğunu gösteren sıfat.",
    "VAKİT": "Saniyelerden yıllara uzanan; akıp giden, geri döndürülemeyen zaman.",
    "VAN": "Kedisiyle ve gölüyle ünlü, Türkiye'nin doğusundaki büyük il.",
    "VATAN": "Bir milletin üzerinde yaşayıp kendine yurt bildiği ata toprağı.",
    "VAZO": "İçine çiçek konulmak üzere yapılmış, ince uzun boyunlu süs kabı.",
    "VECİZE": "Az sözle büyük anlam ifade eden, akılda kalan özlü söz.",
    "VEDA": "Bir kimseyle ayrılırken söylenen son söz; ayrılık selamı.",
    "VEFA": "Dostluğunu ve sevgisini zaman geçse bile sürdürme; söze sadakat.",
    "VERİ": "Bilgisayarlarda işlenmek üzere saklanan; rakam, harf ve sembollerden oluşan bilgi.",
    "VOLKAN": "İçinden kızgın lavlar fışkırtan, zirvesi patlayan alevli büyük dağ.",
})

# --- Y ---
CLUES.update({
    "YADİGAR": "Sevilen birinden hatıra kalan; onu anmamızı sağlayan değerli eşya.",
    "YAKA": "Gömleğin boynu çevreleyen üst kısmı; ceketin de boyuna değen kenarı.",
    "YAMA": "Eskiyip yırtılan giysiyi onarmak için üstüne dikilen küçük kumaş parçası.",
    "YAPRAK": "Ağacın dalından sarkan, fotosentez yapıp havaya oksijen veren yeşil organ.",
    "YAR": "Derin ve dik uçurum; aynı zamanda sevilen kişi için kullanılan şiirsel ad.",
    "YARA": "Bir kesik ya da darbe sonucu bedende oluşan açık doku hasarı.",
    "YAYLA": "Yaz aylarında otlak olarak kullanılan, serin havalı yüksek düzlük.",
    "YAZ": "Dört mevsimin en sıcağı; okulların kapandığı, tatillerin geldiği zaman.",
    "YAZAR": "Kitap, hikâye ya da makale gibi edebi eserler kaleme alan kimse.",
    "YAZI": "Kalemin kâğıda bıraktığı; harflerden oluşan okunabilir işaretler.",
    "YAĞ": "Bitkilerden ya da hayvanlardan elde edilen; suda çözünmeyen kaygan madde.",
    "YAĞMUR": "Bulutlardaki su damlalarının yer çekimiyle gökten yağması.",
    "YAŞ": "İnsanın doğduğu günden bu yana geçen toplam yıl; ömürdeki basamak.",
    "YEL": "Havanın bir yönden diğerine doğru hissedilebilir akışı; rüzgâr.",
    "YER": "Üzerinde durduğumuz zemin; bir olayın geçtiği konum.",
    "YOL": "İki yerleşim birimini birbirine bağlayan; üzerinde gidilen döşeli güzergâh.",
    "YURT": "Bir kimsenin doğup büyüdüğü vatanı; ait olduğu aziz memleket.",
    "YUVA": "Kuşların yumurtladığı ağaç dalındaki çöpten örülmüş küçük barınak.",
    "YÜZ": "Gözlerin, burnun ve ağzın bulunduğu baş ön kısmı; ayrıca on kere on sayısı.",
})

# --- Z ---
CLUES.update({
    "ZAAF": "Birinin ya da bir şeyin kolayca etkilenebileceği zayıf noktası.",
    "ZAHMET": "Bir işi başarmak için katlanılan güçlük; çekilen eziyet.",
    "ZAR": "Üzerinde nokta bulunan, oyunlarda atılan altı yüzlü küçük küp.",
    "ZEKA": "Yeni durumlara hızla uyum sağlayıp doğru kararlar verebilme yeteneği.",
    "ZEVAL": "Varlığı yerinde durmayıp sona ermesi; yokluğa geçme hali.",
    "ZEVK": "Yapılan ya da tadılan şeyden alınan; insanın içini hoşnut eden keyif.",
    "ZOR": "Üstesinden gelinmesi emek isteyen; kolayın tam karşıtı sayılan güç iş.",
    "ZURNA": "Düğünlerde davulla birlikte çalınan, ince tiz sesli üflemeli halk çalgısı.",
    "ZÜMRE": "Aynı ortak özellikleri paylaşan kişilerden oluşan topluluk; grup.",
    "ZİRVE": "Bir dağın en yüksek noktası; ulaşılabilecek en üst basamak.",
    "ZİYA": "Karanlığı dağıtan; göze hoş gelen aydınlatıcı parıltı.",
})


def main() -> None:
    changed_files = 0
    changed_clues = 0
    skipped_self = 0
    missing: set[str] = set()

    for fp in sorted(glob.glob('data/puzzle_*.json')):
        p = Path(fp)
        data = json.loads(p.read_text(encoding='utf-8'))
        changed = False
        for w in data.get('words', []):
            ans = (w.get('answer') or '').strip().upper()
            new = CLUES.get(ans)
            if not new:
                missing.add(ans)
                continue
            # Güvenlik: cevap ipucu içinde geçmesin
            if norm(ans) and norm(ans) in norm(new):
                skipped_self += 1
                continue
            if (w.get('clue') or '').strip() != new:
                w['clue'] = new
                changed = True
                changed_clues += 1
        if changed:
            p.write_text(
                json.dumps(data, ensure_ascii=False, indent=2) + '\n',
                encoding='utf-8',
            )
            changed_files += 1

    print(f'changed_files={changed_files}')
    print(f'changed_clues={changed_clues}')
    print(f'skipped_self={skipped_self}')
    if missing:
        print(f'missing_answers={len(missing)}')
        for a in sorted(missing):
            print(f'  - {a}')


if __name__ == '__main__':
    main()

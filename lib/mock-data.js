export const MOCK_PHARMACIES = {
  data: [
    {
      id: 101,
      name: "صيدلية الشفاء الكبرى",
      address: "رام الله، شارع الإرسال، عمارة النور",
      phone: "022987654",
      status: "Open",
      workingHours: "24/7",
      acceptsInsurance: true,
      hasColdChain: true,
      governmentApproved: true,
      rating: 4.8,
      area: "ramallah",
      imageUrl: "/mock/pharmacy_1.jpg",
      medicines: [
        { medicineId: 301, medicineName: "بانادول أدفانس", quantity: 50, price: 15, availability: "InStock" },
        { medicineId: 302, medicineName: "أموكسيسيلين", quantity: 20, price: 35, availability: "LowStock" }
      ]
    },
    {
      id: 102,
      name: "صيدلية المجتمع",
      address: "نابلس، رفيديا، قرب المستشفى الوطني",
      phone: "092345678",
      status: "Closed",
      workingHours: "08:00 - 22:00",
      acceptsInsurance: true,
      hasColdChain: false,
      governmentApproved: true,
      rating: 4.5,
      area: "nablus",
      imageUrl: "/mock/pharmacy_2.jpg",
    }
  ]
};

export const MOCK_FACILITIES = {
  data: [
    {
      id: 201,
      name: "مستشفى شهداء الأقصى",
      type: "Hospital",
      address: "دير البلح - شارع صلاح الدين، قرب مركز الإمارات للتدريب",
      phone: "022982222",
      status: "Open",
      workingHours: "24/7",
      emergency: true,
      area: "middle",
      imageUrl: "/mock/hospital_1.jpg",
      services: [
        { id: 1, name: "الطوارئ", status: "Active" },
        { id: 2, name: "العيادات الخارجية", status: "Active" }
      ]
    },
    {
      id: 202,
      name: "مستشفى ناصر الطبي",
      type: "Hospital",
      address: "خانيونس - شارع البحر، بجوار مخيم خانيونس",
      phone: "092331471",
      status: "Open",
      workingHours: "24/7",
      emergency: true,
      area: "khanyounis",
      imageUrl: "/mock/hospital_2.jpg",
      services: [
        { id: 3, name: "الأورام", status: "Active" },
        { id: 4, name: "غسيل الكلى", status: "Active" }
      ]
    },
    {
      id: 203,
      name: "مجمع الشفاء الطبي",
      type: "complex",
      address: "غزة - حي الرمال، شارع الوحدة (غرب المدينة)",
      phone: "082823311",
      status: "Open",
      workingHours: "24/7",
      emergency: true,
      area: "gaza",
      imageUrl: "/mock/hospital_3.jpg",
      services: [
        { id: 5, name: "الطوارئ", status: "Active" },
        { id: 6, name: "الجراحة", status: "Active" }
      ]
    },
    {
      id: 204,
      name: "المستشفى الميداني الإماراتي",
      type: "field",
      address: "رفح - تل السلطان",
      phone: "082133455",
      status: "Open",
      workingHours: "24/7",
      emergency: true,
      area: "rafah",
      imageUrl: "/mock/hospital_4.jpg",
      services: [
        { id: 7, name: "الطوارئ", status: "Active" }
      ]
    },
    {
      id: 205,
      name: "المستشفى الإندونيسي",
      type: "Hospital",
      address: "شمال غزة - جباليا",
      phone: "082488888",
      status: "Open",
      workingHours: "24/7",
      emergency: true,
      area: "north",
      imageUrl: "/mock/hospital_5.jpg",
      services: [
        { id: 8, name: "الطوارئ", status: "Active" },
        { id: 9, name: "العناية المكثفة", status: "Active" }
      ]
    },
    {
      id: 206,
      name: "عيادات القدس التخصصية",
      type: "Clinic",
      address: "غزة - تل الهوى",
      phone: "082644444",
      status: "Open",
      workingHours: "08:00 - 22:00",
      emergency: false,
      area: "gaza",
      imageUrl: "/mock/hospital_6.jpg",
      services: [
        { id: 10, name: "طب الأطفال", status: "Active" },
        { id: 11, name: "الباطنة", status: "Active" }
      ]
    }
  ]
};

export const MOCK_MEDICINES = {
  data: [
    {
      "id": 301,
      "name": "بانادول أدفانس",
      "scientificName": "Paracetamol 500mg",
      "category": "مسكن",
      "dosage": "500 mg",
      "manufacturer": "GSK",
      "packageInfo": "علبة 24 قرص",
      "description": "مسكن للألم وخافض للحرارة.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/301.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الشفاء الكبرى",
          "area": "رام الله",
          "quantity": 50,
          "price": 15
        },
        {
          "pharmacyName": "صيدلية ناصر المركزية",
          "area": "خان يونس",
          "quantity": 30,
          "price": 15
        }
      ]
    },
    {
      "id": 302,
      "name": "أموكسيسيلين",
      "scientificName": "Amoxicillin 500mg",
      "category": "مضاد حيوي",
      "dosage": "500 mg",
      "manufacturer": "Pharmacare",
      "packageInfo": "علبة 16 كبسولة",
      "description": "مضاد حيوي واسع الطيف لالتهابات الحلق والأذن والصدر.",
      "isCritical": true,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/302.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية المجتمع",
          "area": "نابلس",
          "quantity": 20,
          "price": 35
        }
      ]
    },
    {
      "id": 303,
      "name": "كونكور",
      "scientificName": "Bisoprolol 5mg",
      "category": "قلب وضغط",
      "dosage": "5 mg",
      "manufacturer": "Merck",
      "packageInfo": "علبة 30 قرص",
      "description": "لعلاج ارتفاع ضغط الدم وتنظيم نبض القلب.",
      "isCritical": true,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/303.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الساحل",
          "area": "غزة",
          "quantity": 15,
          "price": 40
        }
      ]
    },
    {
      "id": 304,
      "name": "جلوكوفاج",
      "scientificName": "Metformin 500mg",
      "category": "سكري",
      "dosage": "500 mg",
      "manufacturer": "Merck",
      "packageInfo": "علبة 50 قرص",
      "description": "لضبط سكر الدم لدى مرضى السكري من النوع الثاني.",
      "isCritical": true,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/304.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية المجتمع",
          "area": "نابلس",
          "quantity": 10,
          "price": 20
        },
        {
          "pharmacyName": "صيدلية الساحل",
          "area": "غزة",
          "quantity": 0,
          "price": 20
        }
      ]
    },
    {
      "id": 305,
      "name": "فينتولين بخاخ",
      "scientificName": "Salbutamol Inhaler",
      "category": "تنفسي",
      "dosage": "100 mcg",
      "manufacturer": "GSK",
      "packageInfo": "بخاخ 200 جرعة",
      "description": "موسّع للقصبات لنوبات الربو وضيق التنفس.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/305.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الشفاء الكبرى",
          "area": "رام الله",
          "quantity": 5,
          "price": 25
        }
      ]
    },
    {
      "id": 306,
      "name": "أوجمنتين شراب",
      "scientificName": "Amoxicillin/Clavulanate 457mg/5ml",
      "category": "أطفال",
      "dosage": "457 mg / 5 ml",
      "manufacturer": "GSK",
      "packageInfo": "زجاجة 70 مل",
      "description": "مضاد حيوي معلّق للأطفال.",
      "isCritical": false,
      "requiresColdChain": true,
      "imageUrl": "/mock/medicines/306.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية ناصر المركزية",
          "area": "خان يونس",
          "quantity": 12,
          "price": 45
        }
      ]
    },
    {
      "id": 307,
      "name": "بروفين",
      "scientificName": "Ibuprofen 400mg",
      "category": "مسكن",
      "dosage": "400 mg",
      "manufacturer": "Abbott",
      "packageInfo": "علبة 30 قرص",
      "description": "مسكن ومضاد للالتهاب وخافض للحرارة.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/307.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الساحل",
          "area": "غزة",
          "quantity": 40,
          "price": 12
        },
        {
          "pharmacyName": "صيدلية المجتمع",
          "area": "نابلس",
          "quantity": 25,
          "price": 12
        }
      ]
    },
    {
      "id": 308,
      "name": "فولتارين",
      "scientificName": "Diclofenac Sodium 50mg",
      "category": "مسكن",
      "dosage": "50 mg",
      "manufacturer": "Novartis",
      "packageInfo": "علبة 20 قرص",
      "description": "مضاد للالتهاب لآلام المفاصل والعضلات.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/308.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الشفاء الكبرى",
          "area": "رام الله",
          "quantity": 18,
          "price": 22
        }
      ]
    },
    {
      "id": 309,
      "name": "أزيثرومايسين",
      "scientificName": "Azithromycin 250mg",
      "category": "مضاد حيوي",
      "dosage": "250 mg",
      "manufacturer": "Pfizer",
      "packageInfo": "علبة 6 كبسولات",
      "description": "مضاد حيوي لالتهابات الجهاز التنفسي.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/309.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية ناصر المركزية",
          "area": "خان يونس",
          "quantity": 9,
          "price": 38
        }
      ]
    },
    {
      "id": 310,
      "name": "سيبروفلوكساسين",
      "scientificName": "Ciprofloxacin 500mg",
      "category": "مضاد حيوي",
      "dosage": "500 mg",
      "manufacturer": "Bayer",
      "packageInfo": "علبة 10 أقراص",
      "description": "مضاد حيوي لالتهابات المسالك البولية والجهاز الهضمي.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/310.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الساحل",
          "area": "غزة",
          "quantity": 14,
          "price": 30
        }
      ]
    },
    {
      "id": 311,
      "name": "فلاجيل",
      "scientificName": "Metronidazole 500mg",
      "category": "مضاد حيوي",
      "dosage": "500 mg",
      "manufacturer": "Sanofi",
      "packageInfo": "علبة 20 قرص",
      "description": "لعلاج الالتهابات المعوية والطفيليات.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/311.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية المجتمع",
          "area": "نابلس",
          "quantity": 30,
          "price": 14
        },
        {
          "pharmacyName": "صيدلية الساحل",
          "area": "غزة",
          "quantity": 8,
          "price": 14
        }
      ]
    },
    {
      "id": 312,
      "name": "إنسولين لانتوس",
      "scientificName": "Insulin Glargine 100 IU/ml",
      "category": "سكري",
      "dosage": "100 IU/ml",
      "manufacturer": "Sanofi",
      "packageInfo": "قلم 3 مل",
      "description": "إنسولين طويل المفعول لمرضى السكري.",
      "storageConditions": "يُحفظ في الثلاجة بين 2 و8 درجات",
      "isCritical": true,
      "requiresColdChain": true,
      "imageUrl": "/mock/medicines/312.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الشفاء الكبرى",
          "area": "رام الله",
          "quantity": 6,
          "price": 95
        }
      ]
    },
    {
      "id": 313,
      "name": "أملور",
      "scientificName": "Amlodipine 5mg",
      "category": "قلب وضغط",
      "dosage": "5 mg",
      "manufacturer": "Pfizer",
      "packageInfo": "علبة 30 قرص",
      "description": "لعلاج ارتفاع ضغط الدم والذبحة الصدرية.",
      "isCritical": true,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/313.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية ناصر المركزية",
          "area": "خان يونس",
          "quantity": 22,
          "price": 28
        }
      ]
    },
    {
      "id": 314,
      "name": "كونترولوك",
      "scientificName": "Pantoprazole 40mg",
      "category": "جهاز هضمي",
      "dosage": "40 mg",
      "manufacturer": "Takeda",
      "packageInfo": "علبة 14 قرص",
      "description": "لتقليل حموضة المعدة وعلاج القرحة.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/314.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الساحل",
          "area": "غزة",
          "quantity": 20,
          "price": 33
        },
        {
          "pharmacyName": "صيدلية الشفاء الكبرى",
          "area": "رام الله",
          "quantity": 11,
          "price": 33
        }
      ]
    },
    {
      "id": 315,
      "name": "ليبيتور",
      "scientificName": "Atorvastatin 20mg",
      "category": "أمراض مزمنة",
      "dosage": "20 mg",
      "manufacturer": "Pfizer",
      "packageInfo": "علبة 30 قرص",
      "description": "لخفض الكوليسترول والوقاية من أمراض القلب.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/315.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية المجتمع",
          "area": "نابلس",
          "quantity": 16,
          "price": 48
        }
      ]
    },
    {
      "id": 316,
      "name": "إلتروكسين",
      "scientificName": "Levothyroxine 50mcg",
      "category": "أمراض مزمنة",
      "dosage": "50 mcg",
      "manufacturer": "Aspen",
      "packageInfo": "علبة 100 قرص",
      "description": "لتعويض هرمون الغدة الدرقية.",
      "isCritical": true,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/316.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية ناصر المركزية",
          "area": "خان يونس",
          "quantity": 7,
          "price": 26
        }
      ]
    },
    {
      "id": 317,
      "name": "أسبرين بروتكت",
      "scientificName": "Acetylsalicylic Acid 100mg",
      "category": "قلب وضغط",
      "dosage": "100 mg",
      "manufacturer": "Bayer",
      "packageInfo": "علبة 30 قرص",
      "description": "لمنع تجلط الدم والوقاية من الجلطات.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/317.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الساحل",
          "area": "غزة",
          "quantity": 45,
          "price": 10
        },
        {
          "pharmacyName": "صيدلية المجتمع",
          "area": "نابلس",
          "quantity": 30,
          "price": 10
        }
      ]
    },
    {
      "id": 318,
      "name": "سيتامول شراب",
      "scientificName": "Paracetamol 120mg/5ml",
      "category": "أطفال",
      "dosage": "120 mg / 5 ml",
      "manufacturer": "Jerusalem Pharma",
      "packageInfo": "زجاجة 100 مل",
      "description": "خافض حرارة ومسكن للأطفال.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/318.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الشفاء الكبرى",
          "area": "رام الله",
          "quantity": 24,
          "price": 9
        },
        {
          "pharmacyName": "صيدلية ناصر المركزية",
          "area": "خان يونس",
          "quantity": 12,
          "price": 9
        }
      ]
    },
    {
      "id": 319,
      "name": "كلاريتين",
      "scientificName": "Loratadine 10mg",
      "category": "حساسية",
      "dosage": "10 mg",
      "manufacturer": "Bayer",
      "packageInfo": "علبة 10 أقراص",
      "description": "مضاد للحساسية لا يسبب النعاس.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/319.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية المجتمع",
          "area": "نابلس",
          "quantity": 19,
          "price": 18
        }
      ]
    },
    {
      "id": 320,
      "name": "بلميكورت",
      "scientificName": "Budesonide 0.5mg/2ml",
      "category": "تنفسي",
      "dosage": "0.5 mg / 2 ml",
      "manufacturer": "AstraZeneca",
      "packageInfo": "20 أمبولة للتبخيرة",
      "description": "كورتيزون استنشاقي عبر جهاز التبخيرة للربو.",
      "isCritical": true,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/320.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الساحل",
          "area": "غزة",
          "quantity": 4,
          "price": 60
        }
      ]
    },
    {
      "id": 321,
      "name": "محلول الأملاح",
      "scientificName": "ORS",
      "category": "أطفال",
      "dosage": "20.5 g",
      "manufacturer": "WHO formula",
      "packageInfo": "كيس يُذاب في لتر ماء",
      "description": "لتعويض السوائل والأملاح عند الإسهال والجفاف.",
      "isCritical": true,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/321.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية ناصر المركزية",
          "area": "خان يونس",
          "quantity": 80,
          "price": 3
        },
        {
          "pharmacyName": "صيدلية الساحل",
          "area": "غزة",
          "quantity": 60,
          "price": 3
        }
      ]
    },
    {
      "id": 322,
      "name": "فيتامين د",
      "scientificName": "Vitamin D3 50000 IU",
      "category": "فيتامينات",
      "dosage": "50,000 IU",
      "manufacturer": "Jamjoom",
      "packageInfo": "علبة 4 كبسولات",
      "description": "لعلاج نقص فيتامين د وتقوية العظام.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/322.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الشفاء الكبرى",
          "area": "رام الله",
          "quantity": 33,
          "price": 27
        }
      ]
    },
    {
      "id": 323,
      "name": "فيوسيدين كريم",
      "scientificName": "Fusidic Acid 2%",
      "category": "جلدية",
      "dosage": "2% · 15 g",
      "manufacturer": "LEO Pharma",
      "packageInfo": "أنبوب 15 غرام",
      "description": "مضاد حيوي موضعي لالتهابات الجلد والجروح.",
      "isCritical": false,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/323.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية المجتمع",
          "area": "نابلس",
          "quantity": 13,
          "price": 24
        }
      ]
    },
    {
      "id": 324,
      "name": "سيفترياكسون حقن",
      "scientificName": "Ceftriaxone 1g IV/IM",
      "category": "مضاد حيوي",
      "dosage": "1 g",
      "manufacturer": "Roche",
      "packageInfo": "فيال للحقن",
      "description": "مضاد حيوي بالحقن للالتهابات الشديدة.",
      "isCritical": true,
      "requiresColdChain": false,
      "imageUrl": "/mock/medicines/324.svg",
      "stocks": [
        {
          "pharmacyName": "صيدلية الساحل",
          "area": "غزة",
          "quantity": 10,
          "price": 18
        }
      ]
    }
  ]
};

export const MOCK_DOCTORS = {
  data: [
    {
      id: 401,
      name: "د. محمود حامد النجار",
      specialization: "استشاري جراحة العظام والإصابات",
      bio: "جراحة العمود الفقري والكسور المعقدة",
      experience: 15,
      rating: 4.8,
      reviewsCount: 95,
      facilityName: "مستشفى شهداء الأقصى - دير البلح",
      facilityId: 201,
      licenseNumber: "12345",
      workDays: "يومي",
      workHours: "10:00 - 15:00",
      imageUrl: "/mock/doctor_1.jpg"
    },
    {
      id: 402,
      name: "د. سارة خليل الكرد",
      specialization: "أخصائية طب الأطفال وحديثي الولادة",
      bio: "ماجستير طب الأطفال وسوء التغذية",
      experience: 12,
      rating: 4.95,
      reviewsCount: 210,
      facilityName: "مستشفى ناصر / عيادات الأمل التخصصية - خانيونس",
      facilityId: 202,
      licenseNumber: "12346",
      workDays: "يومي",
      workHours: "14:00 - 18:00",
      imageUrl: "/mock/doctor_2.jpg"
    },
    {
      id: 403,
      name: "د. أحمد محمد النجار",
      specialization: "استشاري أمراض القلب وقسطرة الشرايين",
      bio: "البورد العربي والزمالة البريطانية",
      experience: 17,
      rating: 4.9,
      reviewsCount: 184,
      facilityName: "مجمع الشفاء الطبي / عيادة القدس التخصصية - غزة",
      facilityId: 201,
      licenseNumber: "12347",
      workDays: "يومي",
      workHours: "09:30 - 13:30",
      imageUrl: "/mock/doctor_3.jpg"
    },
    {
      id: 404,
      name: "د. رامي سلامة",
      specialization: "أخصائي طب وجراحة العيون",
      bio: "خبرة واسعة في عمليات الليزك والمياه البيضاء",
      experience: 10,
      rating: 4.7,
      reviewsCount: 120,
      facilityName: null,
      facilityId: null,
      licenseNumber: "12348",
      workDays: "يومي",
      workHours: "10:00 - 14:00",
      imageUrl: "/mock/doctor_4.jpg"
    },
    {
      id: 405,
      name: "د. ليلى عبد القادر",
      specialization: "أخصائية الأمراض الجلدية والتجميل",
      bio: "علاج مشاكل البشرة والشعر بالليزر",
      experience: 8,
      rating: 4.6,
      reviewsCount: 85,
      facilityName: null,
      facilityId: null,
      licenseNumber: "12349",
      workDays: "السبت - الأربعاء",
      workHours: "15:00 - 19:00",
      imageUrl: "/mock/doctor_5.jpg"
    }
  ]
};

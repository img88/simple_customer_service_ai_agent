# Explanations
## System prompt, why structured it the way it is
See **comments** in: [explain_system_prompt.md](./explain_system_prompt.md)

## Chunking strategy, chunk size, overlap, and the reasoning behind your choices
Karena isi dokumen knowledge base tidak terlalu panjang atau bahkan sangat pendek, jadi satu dokumen untuh tanpa dichunk bisa langsung di masukan ke vector store. Meskipun saya sudah menyediakan 2 method chunking, yaitu static dan regex.

## Embedding model choice and why
Untuk embedding model, saya menggunakan gemini-embedding-001 karena:
- Model ini sudah mendukung multi-language sehingga antara query dan document bisa berbeda bahasa. 
- Berdasarkan MTEB (Massive Text Embedding Benchmark), model ini memiliki peringkat yang cukup tinggi, berada di peringkat top 5.
- Model ini cukup baik dalam memahami konteks dan makna dari sebuah teks, sehingga bisa menghasilkan embedding yang akurat.
- Tidak perlu pusing mengelola model sendiri karena sudah dimanage oleh Google.
- Harga relatif murah, yaitu 0.15 USD per 1M tokens
- Dimensi embedding bisa diubah sesuai keperluan, sehingga bisa menghemat biaya komputasi, tanpa terlalu mengorbankan akurasi.

## Limitation of current RAG approach and how you would improve it in a production environment
### Pengelolaan Dokumen
- Hanya bisa mengupload dokumen dari file .txt dan .md saja, padahal dokumen bisa berasal dari berbagai format lain seperti .pdf, .docx, .pptx, dll. Untuk mengatasinya, bisa dengan menambahkan fitur untuk mengkonversi dokumen ke format markdown terlebih dahulu sebelum di-chunk dan di-embed.
- Saat ini hanya bisa mengupload dan memproses satu per satu dokumen. Untuk mengatasinya, bisa dengan menambahkan fitur untuk mengupload banyak dokumen sekaligus dan memprosesnya secara paralel.
- Backend chat dan knowledge management/retrieval disatukan, padahal bisa dipisah menjadi 2 service terpisah sehingga bisa di-deploy secara terpisah dan di-scale sesuai kebutuhan (microservices).
- Tidak ada fitur untuk melakukan update dokumen, sehingga jika dokumen di-update, harus di-delete terlebih dahulu baru di-upload kembali.
### Preprocessing
- Tidak ada fitur untuk melakukan preprocessing dokumen, sehingga jika dokumen mengandung karakter khusus atau format yang tidak sesuai, maka akan terjadi error saat proses chunking atau embedding. Untuk mengatasinya, bisa dengan menambahkan fitur untuk melakukan preprocessing dokumen sebelum di-chunk dan di-embed.
- Perilakukan knowledge base sebagai produk, bukan hanya dokumen biasa, jadi dokumen knowledge perlu dimanage dengan baik, seperti format yang disesuaikan secara standar (harus punya standar dokumen), sehingga bisa mempermudah proses chunking dan embedding.
### Chunking
- Chunking yang terbatas dengan statis atau regex saja, yang mana paragraf bisa terpotong di tengah-tengah, sehingga bisa mengurangi informasi dari konteks yang diberikan. Untuk mengatasinya bisa menggunakan metode chunking parent dan child yang dipotong berdasarkan header atau section, sehingga informasi dari konteks bisa lebih terjaga.
### Embedding
- Hanya bisa satu embedding model saja, jika ingin diganti maka hasil embedding sebelumnya harus dihitung ulang, sehingga akan memakan waktu dan biaya. Untuk mengatasinya bisa dengan menambahkan fitur untuk menyimpan embedding model yang berbeda-beda sehingga bisa diganti-ganti sesuai kebutuhan.
### Retrieval
- Saat ini menggunakan FAISS yang hanya bisa melakukan pencarian berdasarkan kemiripan semantik, sehingga tidak bisa melakukan pencarian berdasarkan keyword atau frase tertentu. Untuk mengatasinya bisa menggunakan hybrid search yang menggabungkan pencarian semantik dan pencarian keyword atau frase tertentu.
### Reranking
- Tidak ada fitur reranking, sehingga informasi yang diambil dari FAISS bisa jadi kurang relevan dengan query, karena tidak diurutkan kembali berdasarkan relevansi. Untuk mengatasinya bisa menggunakan metode reranking untuk meningkatkan relevansi informasi yang diambil dari FAISS.
### LLM
- Hanya bisa satu LLM saja, jika ingin diganti maka harus mengubah kode di beberapa tempat, sehingga akan memakan waktu dan biaya. Untuk mengatasinya bisa dengan menambahkan fitur untuk menyimpan LLM yang berbeda-beda sehingga bisa diganti-ganti sesuai kebutuhan.
### Database
- Saat ini menggunakan SQLite yang hanya bisa menyimpan data dalam satu file, sehingga tidak bisa di-scale sesuai kebutuhan. Untuk mengatasinya bisa menggunakan database yang bisa di-scale sesuai kebutuhan.
### Monitoring
- Tidak ada fitur monitoring, sehingga tidak bisa memantau kinerja sistem yang sedang berjalan. Untuk mengatasinya bisa dengan menambahkan fitur monitoring seperti monitoring biaya, monitoring hasil retrieval, memberikan thumb up dan down pada response AI agar tahu jawabannya membantu atau tidak.
### Logging
- Memakai fitur logging yang seadanya, sehingga jika ada error sistem tidak terlalu terlihat. Untuk mengatasinya bisa dengan menambahkan fitur logging yang lebih baik seperti logging ke file atau database.
### Testing
- Tidak ada fitur testing setelah knowledge base ditambahkan, jadi sebelum knowledge base di-deploy harus di-testing terlebih dahulu untuk memastikan kinerjanya. Untuk mengatasinya bisa dengan menambahkan fitur testing hibrid human + LLM untuk mengecek apakah knowledge base sudah sesuai dengan yang diharapkan.
- Tidak ada unit testing, shingga perubahan kecil bisa saja menyebabkan error yang tidak terdeteksi.
### Limitasi lain
- Masih banyak limitasi yang lain selain yang saya sebutkan diatas, namun limitasi utamanya sudah saya sampaikan. Karena keterbatasan waktu saya hanya bisa menyampaikan limitasi utama saja.

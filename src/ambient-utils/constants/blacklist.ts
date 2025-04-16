const ofacBlacklist = [
    '0x04dba1194ee10112fe6c3207c0687def0e78bacf',
    '0x08723392ed15743cc38513c4925f5e6be5c17243',
    '0x08b2efdcdb8822efe5ad0eae55517cf5dc544251',
    '0x0931ca4d13bb4ba75d9b7132ab690265d749a5e7',
    '0x098b716b8aaf21512996dc57eb0615e2383e2f96',
    '0x0ee5067b06776a89ccc7dc8ee369984ad7db5e06',
    '0x175d44451403edf28469df03a9280c1197adb92c',
    '0x1967d8af5bd86a497fb3dd7899a020e47560daaf',
    '0x1999ef52700c34de7ec2b68a28aafb37db0c5ade',
    '0x19aa5fe80d33a56d56c78e82ea5e50e5d80b4dff',
    '0x19f8f2b0915daa12a3f5c9cf01df9e24d53794f7',
    '0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a',
    '0x21b8d56bda776bbe68655a16895afd96f5534fed',
    '0x2f389ce8bd8ff92de3402ffce4691d17fc4f6535',
    '0x308ed4b7b49797e1a98d3818bff6fe5385410370',
    '0x35fb6f6db4fb05e6a4ce86f2c93691425626d4b1',
    '0x38735f03b30fbc022ddd06abed01f0ca823c6a94',
    '0x39d908dac893cbcb53cc86e0ecc369aa4def1a29',
    '0x3ad9db589d201a710ed237c829c7860ba86510fc',
    '0x3cbded43efdaf0fc77b9c55f6fc9988fcc9b757d',
    '0x3cffd56b47b7b41c56258d9c7731abadc360e073',
    '0x3e37627deaa754090fbfbb8bd226c1ce66d255e9',
    '0x43fa21d92141ba9db43052492e0deee5aa5f0a93',
    '0x48549a34ae37b12f6a30566245176994e17c6b4a',
    '0x4f47bc496083c727c5fbe3ce9cdf2b0f6496270c',
    '0x502371699497d08d5339c870851898d6d72521dd',
    '0x530a64c0ce595026a4a556b703644228179e2d57',
    '0x53b6936513e738f44fb50d2b9476730c0ab3bfc1',
    '0x5512d943ed1f7c8a43f3435c85f7ab68b30121b0',
    '0x5a14e72060c11313e38738009254a90968f58f51',
    '0x5a7a51bfb49f190e5a6060a5bc6052ac14a3b59f',
    '0x5f48c2a71b2cc96e3f0ccae4e39318ff0dc375b2',
    '0x67d40ee1a85bf4a4bb7ffae16de985e8427b6b45',
    '0x6be0ae71e6c41f2f9d0d1a3b8d0f75e6f6a0b46e',
    '0x6f1ca141a28907f78ebaa64fb83a9088b02a8352',
    '0x72a5843cc08275c8171e582972aa4fda8c397b2a',
    '0x797d7ae72ebddcdea2a346c1834e04d1f8df102b',
    '0x7db418b5d567a4e0e8c59ad71be1fce48f3e6107',
    '0x7f19720a857f834887fc9a7bc0a0fbe7fc7f8102',
    '0x7f367cc41522ce07553e823bf3be79a889debe1b',
    '0x7ff9cfad3877f21d41da833e2f775db0569ee3d9',
    '0x83e5bc4ffa856bb84bb88581f5dd62a433a25e0d',
    '0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c',
    '0x901bb9583b24d97e995513c6778dc6888ab6870e',
    '0x931546d9e66836abf687d2bc64b30407bac8c568',
    '0x961c5be54a2ffc17cf4cb021d863c42dacd47fc1',
    '0x97b1043abd9e6fc31681635166d430a458d14f9c',
    '0x983a81ca6fb1e441266d2fbcb7d8e530ac2e05a2',
    '0x9c2bc757b66f24d60f016b6237f8cdd414a879fa',
    '0x9f4cda013e354b8fc285bf4b9a60460cee7f7ea9',
    '0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b',
    '0xa7e5d5a720f06526557c513402f2e6b5fa20b008',
    '0xb6f5ec1a0a9cd1526536d3f0426c429529471f40',
    '0xc2a3829f459b3edd87791c74cd45402ba0a20be3',
    '0xc455f7fd3e0e12afd51fba5c106909934d8a0e4a',
    '0xd0975b32cea532eadddfc9c60481976e39db3472',
    '0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b',
    '0xdcbeffbecce100cce9e4b153c4e15cb885643193',
    '0xe1d865c3d669dcc8c57c8d023140cb204e672ee4',
    '0xe7aa314c77f4233c18c6cc84384a9247c0cf367b',
    '0xe950dc316b836e4eefb8308bf32bf7c72a1358ff',
    '0xed6e0a7e4ac94d976eebfb82ccf777a3c6bad921',
    '0xefe301d259f525ca1ba74a7977b80d5b060b3cca',
    '0xf3701f445b6bdafedbca97d1e477357839e4120d',
    '0xf7b31119c2682c88d88d455dbb9d5932c65cf1be',
    '0xfac583c0cf07ea434052c49115a4682172ab6b4f',
    '0xfec8a60023265364d066a1212fde3930f6ae8da7',
];
const legacyOfacBlacklist = [
    '0x01e2919679362dfbc9ee1644ba9c6da6d6245bb1',
    '0x03893a7c7463ae47d46bc7f091665f1893656003',
    '0x04dba1194ee10112fe6c3207c0687def0e78bacf',
    '0x05e0b5b40b7b66098c2161a5ee11c5740a3a7c45',
    '0x07687e702b410fa43f4cb4af7fa097918ffd2730',
    '0x0836222f2b2b24a3f36f98668ed8f0b38d1a872f',
    '0x08723392ed15743cc38513c4925f5e6be5c17243',
    '0x08b2efdcdb8822efe5ad0eae55517cf5dc544251',
    '0x09193888b3f38c82dedfda55259a82c0e7de875e',
    '0x0931ca4d13bb4ba75d9b7132ab690265d749a5e7',
    '0x098b716b8aaf21512996dc57eb0615e2383e2f96',
    '0x0e3a09dda6b20afbb34ac7cd4a6881493f3e7bf7',
    '0x0ee5067b06776a89ccc7dc8ee369984ad7db5e06',
    '0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc',
    '0x1356c899d8c9467c7f71c195612f8a395abf2f0a',
    '0x169ad27a470d064dede56a2d3ff727986b15d52b',
    '0x175d44451403edf28469df03a9280c1197adb92c',
    '0x178169b423a011fff22b9e3f3abea13414ddd0f1',
    '0x179f48c78f57a3a78f0608cc9197b8972921d1d2',
    '0x1967d8af5bd86a497fb3dd7899a020e47560daaf',
    '0x1999ef52700c34de7ec2b68a28aafb37db0c5ade',
    '0x19aa5fe80d33a56d56c78e82ea5e50e5d80b4dff',
    '0x19f8f2b0915daa12a3f5c9cf01df9e24d53794f7',
    '0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a',
    '0x1e34a77868e19a6647b1f2f47b51ed72dede95dd',
    '0x21b8d56bda776bbe68655a16895afd96f5534fed',
    '0x22aaa7720ddd5388a3c0a3333430953c68f1849b',
    '0x23173fe8b96a4ad8d2e17fb83ea5dcccdca1ae52',
    '0x23773e65ed146a459791799d01336db287f25334',
    '0x242654336ca2205714071898f67e254eb49acdce',
    '0x2573bac39ebe2901b4389cd468f2872cf7767faf',
    '0x26903a5a198d571422b2b4ea08b56a37cbd68c89',
    '0x2717c5e28cf931547b621a5dddb772ab6a35b701',
    '0x2f389ce8bd8ff92de3402ffce4691d17fc4f6535',
    '0x2f50508a8a3d323b91336fa3ea6ae50e55f32185',
    '0x2fc93484614a34f26f7970cbb94615ba109bb4bf',
    '0x308ed4b7b49797e1a98d3818bff6fe5385410370',
    '0x330bdfade01ee9bf63c209ee33102dd334618e0a',
    '0x35fb6f6db4fb05e6a4ce86f2c93691425626d4b1',
    '0x38735f03b30fbc022ddd06abed01f0ca823c6a94',
    '0x39d908dac893cbcb53cc86e0ecc369aa4def1a29',
    '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
    '0x3ad9db589d201a710ed237c829c7860ba86510fc',
    '0x3cbded43efdaf0fc77b9c55f6fc9988fcc9b757d',
    '0x3cffd56b47b7b41c56258d9c7731abadc360e073',
    '0x3e37627deaa754090fbfbb8bd226c1ce66d255e9',
    '0x3efa30704d2b8bbac821307230376556cf8cc39e',
    '0x407cceeaa7c95d2fe2250bf9f2c105aa7aafb512',
    '0x43fa21d92141ba9db43052492e0deee5aa5f0a93',
    '0x4736dcf1b7a3d580672cce6e7c65cd5cc9cfba9d',
    '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
    '0x48549a34ae37b12f6a30566245176994e17c6b4a',
    '0x4f47bc496083c727c5fbe3ce9cdf2b0f6496270c',
    '0x502371699497d08d5339c870851898d6d72521dd',
    '0x527653ea119f3e6a1f5bd18fbf4714081d7b31ce',
    '0x530a64c0ce595026a4a556b703644228179e2d57',
    '0x538ab61e8a9fc1b2f93b3dd9011d662d89be6fe6',
    '0x53b6936513e738f44fb50d2b9476730c0ab3bfc1',
    '0x5512d943ed1f7c8a43f3435c85f7ab68b30121b0',
    '0x57b2b8c82f065de8ef5573f9730fc1449b403c9f',
    '0x58e8dcc13be9780fc42e8723d8ead4cf46943df2',
    '0x5a14e72060c11313e38738009254a90968f58f51',
    '0x5a7a51bfb49f190e5a6060a5bc6052ac14a3b59f',
    '0x5cab7692d4e94096462119ab7bf57319726eed2a',
    '0x5efda50f22d34f262c29268506c5fa42cb56a1ce',
    '0x5f48c2a71b2cc96e3f0ccae4e39318ff0dc375b2',
    '0x5f6c97c6ad7bdd0ae7e0dd4ca33a4ed3fdabd4d7',
    '0x610b717796ad172b316836ac95a2ffad065ceab4',
    '0x653477c392c16b0765603074f157314cc4f40c32',
    '0x67d40ee1a85bf4a4bb7ffae16de985e8427b6b45',
    '0x6be0ae71e6c41f2f9d0d1a3b8d0f75e6f6a0b46e',
    '0x6bf694a291df3fec1f7e69701e3ab6c592435ae7',
    '0x6f1ca141a28907f78ebaa64fb83a9088b02a8352',
    '0x722122df12d4e14e13ac3b6895a86e84145b6967',
    '0x723b78e67497e85279cb204544566f4dc5d2aca0',
    '0x72a5843cc08275c8171e582972aa4fda8c397b2a',
    '0x743494b60097a2230018079c02fe21a7b687eaa5',
    '0x746aebc06d2ae31b71ac51429a19d54e797878e9',
    '0x756c4628e57f7e7f8a459ec2752968360cf4d1aa',
    '0x76d85b4c0fc497eecc38902397ac608000a06607',
    '0x776198ccf446dfa168347089d7338879273172cf',
    '0x77777feddddffc19ff86db637967013e6c6a116c',
    '0x797d7ae72ebddcdea2a346c1834e04d1f8df102b',
    '0x7db418b5d567a4e0e8c59ad71be1fce48f3e6107',
    '0x7f19720a857f834887fc9a7bc0a0fbe7fc7f8102',
    '0x7f367cc41522ce07553e823bf3be79a889debe1b',
    '0x7ff9cfad3877f21d41da833e2f775db0569ee3d9',
    '0x8281aa6795ade17c8973e1aedca380258bc124f9',
    '0x833481186f16cece3f1eeea1a694c42034c3a0db',
    '0x83e5bc4ffa856bb84bb88581f5dd62a433a25e0d',
    '0x84443cfd09a48af6ef360c6976c5392ac5023a1f',
    '0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c',
    '0x8589427373d6d84e98730d7795d8f6f8731fda16',
    '0x88fd245fedec4a936e700f9173454d1931b4c307',
    '0x901bb9583b24d97e995513c6778dc6888ab6870e',
    '0x910cbd523d972eb0a6f4cae4618ad62622b39dbf',
    '0x931546d9e66836abf687d2bc64b30407bac8c568',
    '0x94a1b5cdb22c43faab4abeb5c74999895464ddaf',
    '0x94be88213a387e992dd87de56950a9aef34b9448',
    '0x94c92f096437ab9958fc0a37f09348f30389ae79',
    '0x961c5be54a2ffc17cf4cb021d863c42dacd47fc1',
    '0x97b1043abd9e6fc31681635166d430a458d14f9c',
    '0x983a81ca6fb1e441266d2fbcb7d8e530ac2e05a2',
    '0x9ad122c22b14202b4490edaf288fdb3c7cb3ff5e',
    '0x9c2bc757b66f24d60f016b6237f8cdd414a879fa',
    '0x9f4cda013e354b8fc285bf4b9a60460cee7f7ea9',
    '0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b',
    '0xa160cdab225685da1d56aa342ad8841c3b53f291',
    '0xa5c2254e4253490c54cef0a4347fddb8f75a4998',
    '0xa60c772958a3ed56c1f15dd055ba37ac8e523a0d',
    '0xa7e5d5a720f06526557c513402f2e6b5fa20b008',
    '0xaeaac358560e11f52454d997aaff2c5731b6f8a6',
    '0xaf4c0b70b2ea9fb7487c7cbb37ada259579fe040',
    '0xaf8d1839c3c67cf571aa74b5c12398d4901147b3',
    '0xb04e030140b30c27bcdfaafffa98c57d80eda7b4',
    '0xb1c8094b234dce6e03f10a5b673c1d8c69739a00',
    '0xb20c66c4de72433f3ce747b58b86830c459ca911',
    '0xb541fc07bc7619fd4062a54d96268525cbc6ffef',
    '0xb6f5ec1a0a9cd1526536d3f0426c429529471f40',
    '0xba214c1c1928a32bffe790263e38b4af9bfcd659',
    '0xbb93e510bbcd0b7beb5a853875f9ec60275cf498',
    '0xc2a3829f459b3edd87791c74cd45402ba0a20be3',
    '0xc455f7fd3e0e12afd51fba5c106909934d8a0e4a',
    '0xca0840578f57fe71599d29375e16783424023357',
    '0xcc84179ffd19a1627e79f8648d09e095252bc418',
    '0xcee71753c9820f063b38fdbe4cfdaf1d3d928a80',
    '0xd0975b32cea532eadddfc9c60481976e39db3472',
    '0xd21be7248e0197ee08e0c20d4a96debdac3d20af',
    '0xd47438c816c9e7f2e2888e060936a499af9582b3',
    '0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3',
    '0xd5d6f8d9e784d0e26222ad3834500801a68d027d',
    '0xd691f27f38b395864ea86cfc7253969b409c362d',
    '0xd692fd2d0b2fbd2e52cfa5b5b9424bc981c30696',
    '0xd82ed8786d7c69dc7e052f7a542ab047971e73d2',
    '0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b',
    '0xd8d7de3349ccaa0fde6298fe6d7b7d0d34586193',
    '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b',
    '0xd96f2b1c14db8458374d9aca76e26c3d18364307',
    '0xdcbeffbecce100cce9e4b153c4e15cb885643193',
    '0xdd4c48c0b24039969fc16d1cdf626eab821d3384',
    '0xdf231d99ff8b6c6cbf4e9b9a945cbacef9339178',
    '0xdf3a408c53e5078af6e8fb2a85088d46ee09a61b',
    '0xe1d865c3d669dcc8c57c8d023140cb204e672ee4',
    '0xe7aa314c77f4233c18c6cc84384a9247c0cf367b',
    '0xe950dc316b836e4eefb8308bf32bf7c72a1358ff',
    '0xed6e0a7e4ac94d976eebfb82ccf777a3c6bad921',
    '0xedc5d01286f99a066559f60a585406f3878a033e',
    '0xefe301d259f525ca1ba74a7977b80d5b060b3cca',
    '0xf3701f445b6bdafedbca97d1e477357839e4120d',
    '0xf4b067dd14e95bab89be928c07cb22e3c94e0daa',
    '0xf60dd140cff0706bae9cd734ac3ae76ad9ebc32a',
    '0xf67721a2d8f736e75a49fdd7fad2e31d8676542a',
    '0xf7b31119c2682c88d88d455dbb9d5932c65cf1be',
    '0xfac583c0cf07ea434052c49115a4682172ab6b4f',
    '0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144',
    '0xfec8a60023265364d066a1212fde3930f6ae8da7',
    '0xffbac21a641dcfe4552920138d90f3638b3c9fba',
];

const byBitHackBlacklist = [
    '0x51E9d833Ecae4E8D9D8Be17300AEE6D3398C135D',
    '0x96244D83DC15d36847C35209bBDc5bdDE9bEc3D8',
    '0x83c7678492D623fb98834F0fbcb2E7b7f5Af8950',
    '0x83Ef5E80faD88288F770152875Ab0bb16641a09E',
    '0xAF620E6d32B1c67f3396EF5d2F7d7642Dc2e6CE9',
    '0x3A21F4E6Bbe527D347ca7c157F4233c935779847',
    '0xfa3FcCCB897079fD83bfBA690E7D47Eb402d6c49',
    '0xFc926659Dd8808f6e3e0a8d61B20B871F3Fa6465',
    '0xb172F7e99452446f18FF49A71bfEeCf0873003b4',
    '0x6d46bd3AfF100f23C194e5312f93507978a6DC91',
    '0xf0a16603289eAF35F64077Ba3681af41194a1c09',
    '0x23Db729908137cb60852f2936D2b5c6De0e1c887',
    '0x40e98FeEEbaD7Ddb0F0534Ccaa617427eA10187e',
    '0x140c9Ab92347734641b1A7c124ffDeE58c20C3E3',
    '0x684d4b58Dc32af786BF6D572A792fF7A883428B9',
    '0xBC3e5e8C10897a81b63933348f53f2e052F89a7E',
    '0x5Af75eAB6BEC227657fA3E749a8BFd55f02e4b1D',
    '0xBCA02B395747D62626a65016F2e64A20bd254A39',
    '0x4C198B3B5F3a4b1Aa706daC73D826c2B795ccd67',
    '0xCd7eC020121Ead6f99855cbB972dF502dB5bC63a',
    '0xbdE2Cc5375fa9E0383309A2cA31213f2D6cabcbd',
    '0xD3C611AeD139107DEC2294032da3913BC26507fb',
    '0xB72334cB9D0b614D30C4c60e2bd12fF5Ed03c305',
    '0x8c7235e1A6EeF91b980D0FcA083347FBb7EE1806',
    '0x1bb0970508316DC735329752a4581E0a4bAbc6B4',
    '0x1eB27f136BFe7947f80d6ceE3Cf0bfDf92b45e57',
    '0xCd1a4A457cA8b0931c3BF81Df3CFa227ADBdb6E9',
    '0x09278b36863bE4cCd3d0c22d643E8062D7a11377',
    '0x660BfcEa3A5FAF823e8f8bF57dd558db034dea1d',
    '0xE9bc552fdFa54b30296d95F147e3e0280FF7f7e6',
    '0x30a822CDD2782D2B2A12a08526452e885978FA1D',
    '0xB4a862A81aBB2f952FcA4C6f5510962e18c7f1A2',
    '0x0e8C1E2881F35Ef20343264862A242FB749d6b35',
    '0x9271EDdda0F0f2bB7b1A0c712bdF8dbD0A38d1Ab',
    '0xe69753Ddfbedbd249E703EB374452E78dae1ae49',
    '0x2290937A4498C96eFfb87b8371a33D108F8D433f',
    '0x959c4CA19c4532C97A657D82d97acCBAb70e6fb4',
    '0x52207Ec7B1b43AA5DB116931a904371ae2C1619e',
    '0x9eF42873Ae015AA3da0c4354AeF94a18D2B3407b',
    '0x1542368a03ad1f03d96D51B414f4738961Cf4443',
    '0x21032176B43d9f7E9410fB37290a78f4fEd6044C',
    '0xA4B2Fd68593B6F34E51cB9eDB66E71c1B4Ab449e',
    '0x55CCa2f5eB07907696afe4b9Db5102bcE5feB734',
    '0xA5A023E052243b7cce34Cbd4ba20180e8Dea6Ad6',
    '0xdD90071D52F20e85c89802e5Dc1eC0A7B6475f92',
    '0x1512fcb09463A61862B73ec09B9b354aF1790268',
    '0xF302572594a68aA8F951faE64ED3aE7DA41c72Be',
    '0x723a7084028421994d4a7829108D63aB44658315',
    '0xf03AfB1c6A11A7E370920ad42e6eE735dBedF0b1',
    '0xEB0bAA3A556586192590CAD296b1e48dF62a8549',
    '0xD5b58Cf7813c1eDC412367b97876bD400ea5c489',
];

export const blacklist = Array.from(
    new Set(
        ofacBlacklist
            .concat(legacyOfacBlacklist)
            .concat(byBitHackBlacklist)
            .map((addr: string) => addr.toLowerCase()),
    ),
);

// if blacklist is already lowercase
export const checkBlacklist = (addr: string) => {
    const isOnBlacklist = blacklist.includes(addr.toLowerCase());
    return isOnBlacklist;
};

export const excludedTokenAddressesLowercase = [
    '0xd294412741ee08aa3a35ac179ff0b4d9d7fefb27'.toLowerCase(), // fake SCR
    ...(import.meta.env.VITE_EXCLUDED_TOKEN_ADDRESSES || '')
        .split(',')
        .filter(Boolean)
        .map((address: string) => address.toLowerCase()),
];

// Hardcoded list of hidden tokens
export const hiddenTokens = [
    {
        // mistake on coingecko's scroll list
        address: '0x7122985656e38bdc0302db86685bb972b145bd3c',
        chainId: 534352,
    },
    {
        // different sepolia USDC on Scroll-Tech's scroll list
        address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        chainId: 11155111,
    },
    {
        // different sepolia USDC on Scroll-Tech's scroll scroll list
        address: '0x7878290DB8C4f02bd06E0E249617871c19508bE6',
        chainId: 534351,
    },
    {
        // aUSDC on Plume Devnet
        address: '0xef380e725648cfe1488d98973151599a75186016',
        chainId: 98864,
    },
    {
        // USDT on Plume Devnet
        address: '0x2413b8C79Ce60045882559f63d308aE3DFE0903d',
        chainId: 98864,
    },
    {
        // Ambient USDCv1 on Swell Testnet
        address: '0x4d65fb724ced0cfc6abfd03231c9cdc2c36a587b',
        chainId: 1924,
    },
    {
        // Ambient USDCv2 on Swell Testnet
        address: '0xCA97CC9c1a1dfA54A252DaAFE9b5Cd1E16C81328',
        chainId: 1924,
    },
    {
        // WTT on Plume Mainnet
        address: '0x3211dFB6c2d3F7f15D7568049a86a38fcF1b00D3',
        chainId: 98865,
    },
    {
        // WTT on Swell Mainnet
        address: '0x83CA2E0018cBa6CD1149F2BB059d2Fc6D0fDf456',
        chainId: 1923,
    },
    {
        // pETH on Mainnet
        address: '0x821a278dfff762c76410264303f25bf42e195c0c',
        chainId: 1,
    },
    {
        // old pUSD on Plume Mainnet
        address: '0x360822f796975cEccD8095c10720c57567b4199f',
        chainId: 98865,
    },
    {
        // old WTT on Base Testnet
        address: '0xfefd8bcb0034a2b0e3cc22e2f5a59279fae67128',
        chainId: 84532,
    },
    {
        // old nRWA on Plume Mainnet
        address: '0x11a8d8694b656112d9a94285223772F4aAd269fc',
        chainId: 98866,
    },
    {
        // nUSDY on Plume Mainnet
        address: '0x7Fca0Df900A11Ae1d17338134a9e079a7EE87E31',
        chainId: 98866,
    },
    {
        // nYIELD on Plume Mainnet
        address: '0x892DFf5257B39f7afB7803dd7C81E8ECDB6af3E8',
        chainId: 98866,
    },
];

const embargoedTokens = [
    {
        // SWELL token on mainnet
        address: '0x0a6E7Ba5042B38349e437ec6Db6214AEC7B35676',
        chainId: 1,
        embargoedUntil: 1730973600, // nov. 7, '24 at 10 am UTC
    },
];

const currentTime = Date.now() / 1000;

// if current time is less than embargoed time, add to hidden tokens
embargoedTokens.forEach((token) => {
    if (currentTime < token.embargoedUntil) {
        hiddenTokens.push(token);
    }
});

// if blacklist is not already lowercase
// export const checkBlacklist = (addr: string) => {
//     const blacklistLowerCase = blacklist.map((addr: string) => addr.toLowerCase());
//     const isOnBlacklist = blacklistLowerCase.includes(addr.toLowerCase());
//     return isOnBlacklist;
// };

/* 
sdn_list=$(curl -L https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML)

input=( $(echo "$sdn_list" | 
        egrep "0x[A-Fa-f0-9]{40}" | 
        sed 's+.*\(0x[A-Fa-f0-9]\{40\}\).*+\1+' | 
        sed 'y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/'|
         sort | uniq) ) 

output=($(
for i in ${input[@]}
        do
        echo -ne "'$i',"
done
))
output=${output[@]}
echo ${output//,/, } 
*/
